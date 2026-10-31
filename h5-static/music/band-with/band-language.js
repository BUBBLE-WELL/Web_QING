// One persisted Web UI language. Values, recordings, focus and user text are not rewritten.
(function (root) {
  'use strict';
  const key = 'agent-companion-ui', listeners = new Set();
  const zh = {
    'SETTINGS':'设置','WELCOME.EXE':'欢迎','SETUP / 01':'设置 / 01','DRUM MACHINE':'鼓机','TUNER / BROWSER AUDIO':'调音 / 浏览器输入','TUNER / LOCAL AUDIO':'调音 / 本地输入','AUDIO':'音频','INPUT':'输入','OUTPUT (LISTENING)':'监听输出','SOFTWARE MONITOR (debug)':'软件监听（调试）','APPLY AUDIO':'应用音频设置','Try ':'试试 ',' or ':' 或 ','Collapse feature monitor':'收起信号监测','Expand feature monitor':'展开信号监测','▶ PLAY':'▶ 演奏','TOOLS':'工具','TUNER':'调音','DRUMS':'鼓声','PIXEL DRAW':'像素画','VISION':'视觉','TODAY':'今日回顾',
    'Desk tools':'桌面工具','Move tools bar':'移动工具栏','Drag or use arrow keys to move':'拖动，或用方向键移动','Open the far-view PLAY HUD inside this Desk':'在此桌面打开远视演奏界面',
    'DESK / LIVE INFORMATION STREAM':'桌面 / 实时动态','Feature Monitor':'信号监测','MUSICAL STATE':'音乐状态','INPUT WAVEFORM':'输入波形','ROUTING':'音频路由','LAST EVENT':'最近事件','SCENES':'场景','TRASH':'回收站',
    'YOUR NAME':'你的名字','COMPANION NAME':'伙伴名字','WELCOME SLOGAN':'欢迎语','LANGUAGE':'语言','SAVE':'保存','SAVE & CONTINUE':'保存并继续','INITIALIZE COMPANION':'设置伙伴','EDIT SETUP':'修改设置','ENTER CHATBOX':'进入桌面',
    'SEND':'发送','Tell me what you want to play…':'想弹些什么？','your name':'你的名字','CHATBOX':'对话','Welcome, {name}. Tell me the room you want to make.':'欢迎，{name}。说说你想营造怎样的音乐空间。',
    "let's get rolling today!":'今天一起弹点什么吧！','INPUT BOOST':'输入增益','CLEAN MIX':'输入监听音量','DRUM MIX':'伙伴音量','No live audio':'没有实时音频','NO LIVE AUDIO':'没有实时音频',
    'Browser microphone monitor · headphones only.':'浏览器输入监听 · 请使用耳机。','Use headphones for browser monitoring.':'浏览器监听请使用耳机。','Browser microphone monitoring · use headphones.':'浏览器输入监听，请使用耳机。',
    'IN SETTINGS':'请到设置调整','MONITOR OFF':'监听已关闭','MONITOR ON':'监听已开启','Browser monitor off.':'浏览器监听已关闭。','Browser monitor on · use headphones.':'浏览器监听已开启，请使用耳机。','Monitor armed.':'监听已开启。','Safe default / monitor off.':'安全默认状态 / 监听已关闭。',
    'LIVE MIC · Input gain':'实时输入 · 输入增益','CLIPPING · Lower input boost':'信号削波 · 请降低输入增益',
    'Camera frames are processed on the demo server; raw images are not retained.':'摄像头画面会发送到演示服务器分析，不保留原始图像。','Checking Vision availability…':'正在检查视觉能力…','Switch to Live to test Vision.':'请切换到实时模式后测试视觉。','Vision temporarily unavailable.':'视觉能力暂不可用。','Camera frames are analysed on the demo server; raw images are not retained.':'摄像头画面会发送到演示服务器分析，不保留原始图像。',
    'LIVE':'实时','DEMO REPLAY':'示例回放','AUDIO LIVE':'实时音频','ONLINE':'已连接','OFFLINE':'未连接','LATENCY':'延迟','Waiting for signal.':'等待输入信号。','New attack detected.':'检测到新的起音。','Space / silence.':'留白 / 静音。','Listening for signal.':'正在聆听输入。','WAVEFORM NOT PROVIDED / RMS LIVE':'当前只有实时音量，未提供波形','OPEN THROUGH LOCAL SERVICE FOR LIVE AUDIO':'请通过本地服务打开实时音频',
    'Control unavailable':'控制暂不可用','API unavailable / local preview mode.':'服务暂不可用 / 本地预览模式。','Semantic visual stream active.':'视觉状态流已连接。','Open local Console':'打开本地控制台',
    'START TUNER':'开始调音','STOP TUNER':'停止调音','Auto / nearest string':'自动 / 最近琴弦','waiting for microphone':'等待麦克风','Guitar':'吉他','Bass / 4-string':'贝斯 / 四弦',
    'REVIEW':'回顾','SESSION REVIEW':'会话回顾','Duration':'时长','Activity':'活动线索','How did the companion follow?':'伙伴跟得怎么样？','Too much':'太多','Just right':'刚好','Too little':'太少','No performance data yet. Play the demo or start playing.':'还没有演奏数据，可以播放示例或开始演奏。','No onsets detected yet.':'还没有检测到起音。','Saved. One starting choice will follow this next time.':'已记住，下次会据此调整一个起始选择。',
    'Close today review':'关闭今日回顾','Close drums tool':'关闭鼓声工具','Close tuner':'关闭调音工具','Close vision tool':'关闭视觉工具','Close settings':'关闭设置','Close pixel sketch':'关闭像素画工具','Return to Desk':'返回桌面',
    'Test sounds':'试听音色','Preview before playback':'在开始演奏前试听','MUSICAL RESPONSE':'音乐回应','GROOVE SELECT':'节奏选择','TEMPO BPM':'速度 BPM','SET':'设置','MORE':'多一点','LESS':'少一点','KEEP':'保持','REST':'留白','HALF':'减半','DOUBLE':'加倍','AUTO START / JOIN ME':'自动加入','AUTO REST / 2 BARS':'自动留白 / 两小节',
    'START':'开始','STOP':'停止','Musical response unavailable.':'音乐回应暂不可用。','Start drums to use musical response.':'开始鼓声后可调整音乐回应。','Metronome running — start drums to use musical response.':'节拍器正在播放，开始鼓声后可调整音乐回应。','Start Metronome':'开启节拍器','Stop Metronome':'关闭节拍器','AUTO / FOLLOW ME':'自动 / 跟随演奏','Density':'密度','Sending':'正在发送','KEEP active':'保持已开启','queued for bar':'等待小节','unavailable':'不可用','rejected':'未接受','not sent':'未发送','drums offline · reconnecting to the Web service':'鼓声离线，正在重连服务','service offline · start the local audio service to use drums':'服务离线，请先启动本地音频服务',
    'METRONOME':'节拍器','PLAYING':'播放中','STARTING':'正在启动','STOPPED':'已停止','BAR':'小节','CONF':'置信度',
    'Audio stays local when UI disconnects':'关闭界面后，本地音频仍继续运行','Microphone observations require consent':'麦克风输入需授权','FeatureFrame / WebSocket stream':'实时连接','PANIC / RESET':'紧急停止 / 复位'
  };
  function read() { try { return JSON.parse(root.localStorage.getItem(key) || '{}').lang === 'zh' ? 'zh' : 'en'; } catch { return 'en'; } }
  let lang = read();
  const phrase = text => lang === 'zh' ? (zh[text] || text) : text;
  function direct(node, text) {
    if (!node) return;
    const existing = [...node.childNodes].find(child => child.nodeType === 3 && child.textContent.trim());
    if (existing) existing.textContent = phrase(text);
    else node.insertBefore(document.createTextNode(phrase(text)),node.firstChild);
  }
  const labels = [
    ['[data-settings]','SETTINGS'],['[data-open-play]','▶ PLAY'],['[data-dock-handle]','TOOLS'],
    ...['tuner','drums','pixel','vision','today'].map((name,i)=>[`[data-open-tool="${name}"]`,['TUNER','DRUMS','PIXEL DRAW','VISION','TODAY'][i]]),
    ['.desk-label','DESK / LIVE INFORMATION STREAM'],['[data-window] > .window-bar > span:first-child','Feature Monitor'],['.hero-row .micro-label','MUSICAL STATE'],['.meter-heading > span:first-child','INPUT WAVEFORM'],
    ['.tool-block--state .tool-title','ROUTING'],['.tool-block--event .tool-title','LAST EVENT'],['.desktop-icon--folder > span:last-child','SCENES'],['.desktop-icon--trash > span:last-child','TRASH'],
    ['[data-settings-panel] > .window-bar > span:first-child','SETTINGS'],['[data-entry] > .window-bar > span:first-child','WELCOME.EXE'],['[data-entry] > .window-bar > span:last-child','SETUP / 01'],['[data-save-settings]','SAVE'],['[data-init-form] button[type="submit"]','SAVE & CONTINUE'],['[data-enter]','ENTER CHATBOX'],['[data-chat-form] button','SEND'],
    ['[data-tool-window="today"] .micro-label','SESSION REVIEW'],['#today-title','TODAY'],
    ['[data-tool-window="today"] .today-card:nth-of-type(1) > b','Duration'],['[data-tool-window="today"] .today-card:nth-of-type(2) > b','Activity'],['[data-tool-window="today"] .today-card:nth-of-type(3) > b','How did the companion follow?'],
    ['[data-today-choice="too_much"]','Too much'],['[data-today-choice="just_right"]','Just right'],['[data-today-choice="too_little"]','Too little'],
    ['[data-drums] h2','DRUM MACHINE'],['.settings-audio legend','AUDIO'],['[data-audio-apply]','APPLY AUDIO'],['.drums-audition > .micro-label','Test sounds'],['.drums-audition > small','Preview before playback'],['.drums-response > .micro-label','MUSICAL RESPONSE'],['label[for="drums-tempo-bpm"]','TEMPO BPM'],['[data-tempo-set]','SET'],
    ...['MORE','LESS','KEEP','REST','HALF','DOUBLE'].map(action=>[`[data-drums-action="${action}"]`,action]),
    ['.console-footer > span:first-child','FeatureFrame / WebSocket stream'],['[data-panic]','PANIC / RESET']
  ];
  function setLanguage(next) {
    if(!['en','zh'].includes(next))return false;
    try {
      const profile=JSON.parse(root.localStorage.getItem(key)||'{}');
      root.localStorage.setItem(key,JSON.stringify({...profile,lang:next}));
      refresh();return true;
    } catch {
      const status=root.document?.querySelector('[data-language-status]');
      if(status){status.hidden=false;status.textContent=lang==='zh'?'语言设置未能保存，请重试。':'Could not save the language setting. Try again.';}
      return false;
    }
  }
  function mountSwitch(doc) {
    const actions=doc.querySelector('.topbar-actions');if(!actions)return;
    let button=doc.querySelector('[data-language-toggle]');
    if(!button){
      button=doc.createElement('button');button.type='button';button.className='settings-button language-toggle';button.dataset.languageToggle='';
      button.innerHTML='<span data-language-choice="en">EN</span><span aria-hidden="true"> / </span><span data-language-choice="zh">中文</span>';
      button.addEventListener('click',()=>setLanguage(lang==='en'?'zh':'en'));
      actions.insertBefore(button,actions.querySelector('[data-settings]'));
      const status=doc.createElement('span');status.dataset.languageStatus='';status.setAttribute('role','status');status.hidden=true;actions.append(status);
      doc.querySelector('.console-shell')?.classList.add('has-language-switch');
    }
    button.setAttribute('aria-label',lang==='en'?'Switch to Chinese':'切换为英文');
    button.title=lang==='en'?'Switch to Chinese':'切换为英文';
    button.querySelectorAll('[data-language-choice]').forEach(node=>node.dataset.active=String(node.dataset.languageChoice===lang));
    doc.querySelectorAll('[data-setting-lang],[data-lang]').forEach(select=>{select.value=lang;});
  }
  function apply() {
    const doc = root.document;if (!doc?.querySelectorAll) return;
    doc.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    mountSwitch(doc);
    const footer=doc.querySelector('.console-footer > span:nth-child(2)');
    if(footer)footer.textContent=phrase(doc.querySelector('.console-shell')?.dataset.runtimeMode==='web'?'Microphone observations require consent':'Audio stays local when UI disconnects');
    labels.forEach(([selector,text])=>doc.querySelectorAll(selector).forEach(node=>{node.textContent=phrase(text);}));
    // Refresh already-rendered known status copy; never change protocol values or history.
    const canonical=value=>Object.hasOwn(zh,value)?value:(Object.entries(zh).find(([,translated])=>translated===value)?.[0]||value);
    ['[data-connection]','[data-event]','[data-waveform-empty]','[data-status]','[data-monitor-toggle]','[data-tuner-start]','[data-tuner-frequency]'].forEach(selector=>{
      const node=doc.querySelector(selector);if(node)node.textContent=phrase(canonical(node.textContent.trim()));
    });
    [['[data-user-name]','YOUR NAME'],['[data-agent-name]','COMPANION NAME'],['[data-lang]','LANGUAGE'],['[data-setting-user]','YOUR NAME'],['[data-setting-agent]','COMPANION NAME'],['[data-setting-lang]','LANGUAGE'],['[data-setting-slogan]','WELCOME SLOGAN'],['[data-audio-input]','INPUT'],['[data-audio-output]','OUTPUT (LISTENING)'],['[data-audio-monitor]','SOFTWARE MONITOR (debug)'],['[data-drums-preset]','GROOVE SELECT'],['[data-drums-auto-start]','AUTO START / JOIN ME'],['[data-drums-auto]','AUTO REST / 2 BARS']].forEach(([selector,text])=>direct(doc.querySelector(selector)?.closest('label'),text));
    [['[data-control="clean_mix"]','CLEAN MIX'],['[data-control="drum_mix"]','DRUM MIX'],['[data-input-boost]','INPUT BOOST']].forEach(([selector,text])=>direct(doc.querySelector(selector)?.closest('label')?.querySelector('span'),text));
    [['[data-chat-input]','Tell me what you want to play…'],['[data-user-name]','your name']].forEach(([selector,text])=>doc.querySelector(selector)?.setAttribute('placeholder',phrase(text)));
    [['[data-open-play]','Open the far-view PLAY HUD inside this Desk'],['[data-dock-handle]','Drag or use arrow keys to move']].forEach(([selector,text])=>doc.querySelector(selector)?.setAttribute('title',phrase(text)));
    const tuner=doc.querySelector('.tuner-panel > .window-bar > span:first-child');
    if(tuner)tuner.textContent=phrase(doc.querySelector('.console-shell')?.dataset.runtimeMode==='web'?'TUNER / BROWSER AUDIO':'TUNER / LOCAL AUDIO');
    const hint=doc.querySelector('.chatbox-panel > small');
    if(hint){const parts=[...hint.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim());if(parts[0])parts[0].textContent=phrase('Try ');if(parts[1])parts[1].textContent=phrase(' or ');}
    const name=doc.querySelector('[data-agent-label]');if(name&&name.textContent.includes(' / '))name.textContent=name.textContent.split(' / ')[0]+' / '+phrase('CHATBOX');
    doc.querySelector('.desk-dock')?.setAttribute('aria-label',phrase('Desk tools'));
    doc.querySelector('[data-dock-handle]')?.setAttribute('aria-label',phrase('Move tools bar'));
    doc.querySelectorAll('[data-close-tool],[data-close-settings],[data-play-close]').forEach(node=>{if(!node.dataset.languageLabel)node.dataset.languageLabel=node.getAttribute('aria-label')||'';if(node.dataset.languageLabel)node.setAttribute('aria-label',phrase(node.dataset.languageLabel));});
    const stamp=doc.querySelector('.pixel-stamp');if(stamp){let index=0;[...stamp.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).forEach(n=>{n.textContent=(lang==='zh'?['我的','音乐','伙伴']:['MY','AGENT','COMPANION'])[index++]||'';});}
  }
  function refresh() {
    const next=read();if(next===lang)return;
    lang=next;apply();listeners.forEach(fn=>{try{fn(lang);}catch{}});
    root.dispatchEvent?.(new CustomEvent('band:language',{detail:lang}));
  }
  const api={current:()=>lang,set:setLanguage,phrase,refresh,apply,subscribe(fn){listeners.add(fn);fn(lang);return()=>listeners.delete(fn);}};
  root.BandLanguage=api;
  if(typeof module==='object'&&module.exports)module.exports={translations:zh};
  if(root.document?.addEventListener){
    root.document.addEventListener('DOMContentLoaded',apply,{once:true});
    root.document.addEventListener('click',event=>{if(event.target.closest('[data-save-settings]'))queueMicrotask(refresh);},true);
    root.document.addEventListener('submit',event=>{if(event.target.matches('[data-init-form]'))queueMicrotask(refresh);},true);
    root.addEventListener('storage',refresh);apply();
  }
})(typeof window!=='undefined'?window:globalThis);
