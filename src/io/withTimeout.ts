/** Give browser protocol requests a deadline; a stalled request must remain diagnosable. */
export async function withTimeout<T>(operation:Promise<T>,milliseconds:number,label:string):Promise<T> {
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new DOMException(`${label} timed out after ${milliseconds}ms`,'TimeoutError')),milliseconds);})]);}
  finally{if(timer)clearTimeout(timer);}
}
