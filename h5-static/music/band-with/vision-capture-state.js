(function attachVisionCaptureState(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VisionCaptureState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildVisionCaptureState() {
  'use strict';

  const MODES = Object.freeze({
    OFFLINE: 'OFFLINE', LIVE: 'LIVE', COUNTDOWN: 'COUNTDOWN',
    CAPTURED: 'CAPTURED', ANNOTATING: 'ANNOTATING',
    CONFIRMING: 'CONFIRMING', CALIBRATED: 'CALIBRATED',
    TRACKING: 'TRACKING', ERROR: 'ERROR',
  });

  const EVENTS = Object.freeze({
    CAMERA_STARTED: 'CAMERA_STARTED', CAPTURE_REQUESTED: 'CAPTURE_REQUESTED',
    CAMERA_FAILED: 'CAMERA_FAILED', INFERENCE_FAILED: 'INFERENCE_FAILED',
    INFERENCE_RECOVERED: 'INFERENCE_RECOVERED',
    CAPTURE_CANCELLED: 'CAPTURE_CANCELLED', COUNTDOWN_FINISHED: 'COUNTDOWN_FINISHED',
    ANNOTATE: 'ANNOTATE', ANNOTATION_CANCELLED: 'ANNOTATION_CANCELLED',
    POINT_ADDED: 'POINT_ADDED', UNDO: 'UNDO',
    CONFIRM: 'CONFIRM', REFERENCE_ACCEPTED: 'REFERENCE_ACCEPTED',
    REFERENCE_REJECTED: 'REFERENCE_REJECTED', RETRY: 'RETRY',
    RESUME: 'RESUME', RETAKE: 'RETAKE', STOP: 'STOP',
  });

  const EFFECTS = Object.freeze({RELEASE_STILL: 'RELEASE_STILL'});
  const FAILURE_STAGES = Object.freeze({
    ACQUISITION: 'acquisition', PREVIEW: 'preview',
    TRANSPORT: 'transport', INFERENCE: 'inference',
  });

  function freezePoints(points) {
    if (!points) return null;
    return Object.freeze(points.map(point => Object.freeze([...point])));
  }

  function freezeState(value) {
    const state = {
      ...value,
      draftPoints: freezePoints(value.draftPoints || []),
      activePoints: freezePoints(value.activePoints),
    };
    return Object.freeze(state);
  }

  function initialState() {
    return freezeState({
      mode: MODES.OFFLINE,
      cameraOpen: false,
      stillToken: null,
      draftPoints: [],
      pendingCalibrationId: null,
      activeCalibrationId: null,
      activePoints: null,
      returnMode: null,
      error: null,
      failureStage: null,
      failureReason: null,
    });
  }

  function result(state, accepted, effects = [], reason = null) {
    return Object.freeze({state, accepted, effects: Object.freeze([...effects]), reason});
  }

  function reject(state, reason) {
    return result(state, false, [], reason);
  }

  function accept(current, patch, effects = []) {
    return result(freezeState({...current, ...patch}), true, effects);
  }

  function validPoint(point) {
    return Array.isArray(point) && point.length === 2 && point.every(value => Number.isFinite(value) && value >= 0 && value <= 1);
  }

  function validId(value) {
    return typeof value === 'string' && value.length > 0 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value);
  }

  function transition(state, event) {
    if (!state || !Object.values(MODES).includes(state.mode)) throw new TypeError('valid state required');
    if (!event || typeof event.type !== 'string') return reject(state, 'event type required');

    if (event.type === EVENTS.CAMERA_FAILED) {
      if (![FAILURE_STAGES.ACQUISITION, FAILURE_STAGES.PREVIEW, FAILURE_STAGES.TRANSPORT].includes(event.stage)) {
        return reject(state, 'valid camera failure stage required');
      }
      const mode = state.mode === MODES.COUNTDOWN ? (state.returnMode || MODES.LIVE) : state.mode;
      return accept(state, {
        mode, cameraOpen: false, returnMode: state.mode === MODES.COUNTDOWN ? null : state.returnMode,
        failureStage: event.stage, failureReason: String(event.reason || 'camera unavailable'),
      });
    }

    if (event.type === EVENTS.INFERENCE_FAILED) {
      return accept(state, {
        failureStage: FAILURE_STAGES.INFERENCE,
        failureReason: String(event.reason || 'inference unavailable'),
      });
    }

    if (event.type === EVENTS.INFERENCE_RECOVERED) {
      if (state.failureStage !== FAILURE_STAGES.INFERENCE) return reject(state, 'inference is not failed');
      return accept(state, {failureStage: null, failureReason: null});
    }

    if (event.type === EVENTS.CAMERA_STARTED) {
      if (state.cameraOpen) return reject(state, 'camera already started');
      return accept(state, {
        mode: state.mode === MODES.OFFLINE ? MODES.LIVE : state.mode,
        cameraOpen: true, failureStage: null, failureReason: null,
      });
    }

    if (event.type === EVENTS.STOP) {
      if (state.mode === MODES.OFFLINE) return reject(state, 'camera already stopped');
      const effects = state.stillToken ? [EFFECTS.RELEASE_STILL] : [];
      return accept(state, {
        mode: MODES.OFFLINE, cameraOpen: false, stillToken: null,
        draftPoints: [], pendingCalibrationId: null, activeCalibrationId: null,
        activePoints: null, returnMode: null, error: null,
        failureStage: null, failureReason: null,
      }, effects);
    }

    switch (state.mode) {
      case MODES.OFFLINE:
        break;
      case MODES.LIVE:
      case MODES.TRACKING:
        if (event.type === EVENTS.CAPTURE_REQUESTED) {
          return accept(state, {mode: MODES.COUNTDOWN, returnMode: state.mode, error: null});
        }
        break;
      case MODES.COUNTDOWN:
        if (event.type === EVENTS.CAPTURE_CANCELLED) {
          return accept(state, {mode: state.returnMode || MODES.LIVE, returnMode: null, error: null});
        }
        if (event.type === EVENTS.COUNTDOWN_FINISHED) {
          if (typeof event.stillToken !== 'string' || !event.stillToken) return reject(state, 'still token required');
          return accept(state, {
            mode: MODES.CAPTURED, stillToken: event.stillToken,
            draftPoints: [], pendingCalibrationId: null, returnMode: null, error: null,
          });
        }
        break;
      case MODES.CAPTURED:
        if (event.type === EVENTS.ANNOTATE) {
          return accept(state, {mode: MODES.ANNOTATING, draftPoints: [], error: null});
        }
        break;
      case MODES.ANNOTATING:
        if (event.type === EVENTS.ANNOTATION_CANCELLED) {
          return accept(state, {mode: MODES.CAPTURED, draftPoints: [], error: null});
        }
        if (event.type === EVENTS.POINT_ADDED) {
          if (!validPoint(event.point)) return reject(state, 'normalized point required');
          if (state.draftPoints.length >= 4) return reject(state, 'four points already supplied');
          return accept(state, {draftPoints: [...state.draftPoints, [...event.point]], error: null});
        }
        if (event.type === EVENTS.UNDO) {
          if (!state.draftPoints.length) return reject(state, 'no point to undo');
          return accept(state, {draftPoints: state.draftPoints.slice(0, -1), error: null});
        }
        if (event.type === EVENTS.CONFIRM) {
          if (state.draftPoints.length !== 4) return reject(state, 'exactly four points required');
          if (!validId(event.calibrationId)) return reject(state, 'valid calibration id required');
          return accept(state, {
            mode: MODES.CONFIRMING, pendingCalibrationId: event.calibrationId, error: null,
          });
        }
        break;
      case MODES.CONFIRMING:
        if (event.type === EVENTS.REFERENCE_ACCEPTED) {
          if (event.calibrationId !== state.pendingCalibrationId || event.status !== 'initialized') {
            return reject(state, 'reference acknowledgement does not match');
          }
          return accept(state, {
            mode: MODES.CALIBRATED,
            activeCalibrationId: state.pendingCalibrationId,
            activePoints: state.draftPoints.map(point => [...point]),
            pendingCalibrationId: null,
            error: null,
          });
        }
        if (event.type === EVENTS.REFERENCE_REJECTED) {
          if (event.calibrationId !== state.pendingCalibrationId) return reject(state, 'reference rejection does not match');
          return accept(state, {mode: MODES.ERROR, error: String(event.reason || 'reference rejected')});
        }
        break;
      case MODES.ERROR:
        if (event.type === EVENTS.RETRY) {
          if (!state.stillToken || !state.pendingCalibrationId || state.draftPoints.length !== 4) {
            return reject(state, 'reference is not retryable');
          }
          return accept(state, {mode: MODES.CONFIRMING, error: null});
        }
        break;
      case MODES.CALIBRATED:
        if (event.type === EVENTS.RESUME) {
          return accept(state, {mode: MODES.TRACKING, error: null});
        }
        break;
      default:
        break;
    }

    if (event.type === EVENTS.RETAKE && [MODES.CAPTURED, MODES.ANNOTATING, MODES.CALIBRATED, MODES.ERROR].includes(state.mode)) {
      return accept(state, {
        mode: MODES.COUNTDOWN,
        stillToken: null,
        draftPoints: [],
        pendingCalibrationId: null,
        returnMode: state.activeCalibrationId ? MODES.TRACKING : MODES.LIVE,
        error: null,
      }, state.stillToken ? [EFFECTS.RELEASE_STILL] : []);
    }

    return reject(state, `${event.type} is not allowed from ${state.mode}`);
  }

  return Object.freeze({MODES, EVENTS, EFFECTS, FAILURE_STAGES, initialState, transition});
});
