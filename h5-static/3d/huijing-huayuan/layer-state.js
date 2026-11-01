// One authoritative visibility state, shared by controls and requested presentations.
export function createLayerState(){
 const states=new Map();
 return {
  register(id,visible,apply){if(states.has(id))throw new Error('Duplicate layer');states.set(id,{visible:!!visible,revision:0,apply});},
  get(id){const s=states.get(id);if(!s)throw new Error('Unknown layer');return {visible:s.visible,revision:s.revision};},
  set(id,visible){const s=states.get(id);if(!s)throw new Error('Unknown layer');s.visible=!!visible;s.revision++;return s.apply(s.visible);},
  async borrow(ids){
   const changes=[];
   try{for(const id of ids){const before=this.get(id);if(before.visible)continue;const pending=this.set(id,true);const owned=this.get(id).revision;changes.push({id,before,owned});await pending;}}
   catch(error){for(const c of changes.reverse())if(this.get(c.id).revision===c.owned)await this.set(c.id,c.before.visible);throw error;}
   return async()=>{for(const c of changes.reverse())if(this.get(c.id).revision===c.owned)await this.set(c.id,c.before.visible);};
  }
 };
}
