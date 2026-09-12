export type PixelImage={readonly width:number;readonly height:number;readonly data:Uint8Array};
export type PixelComparison={readonly error:number;readonly meanAbsoluteError:number;readonly changedPixels:number;readonly dimensionsMatch:boolean;readonly regions:readonly {readonly x:number;readonly y:number;readonly width:number;readonly height:number;readonly changedPixels:number}[];readonly diff:PixelImage};
export type PixelComparator=(reference:PixelImage,target:PixelImage,tolerance:number)=>PixelComparison;
export const comparePixels:PixelComparator=(reference,target,tolerance)=>{
  const width=Math.max(reference.width,target.width),height=Math.max(reference.height,target.height);
  const data=new Uint8Array(width*height*4);let changedPixels=0;let totalError=0;
  const tiles=new Map<string,{x:number;y:number;width:number;height:number;changedPixels:number}>();
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const inside=x<reference.width&&y<reference.height&&x<target.width&&y<target.height;
    let maximum=inside?0:255;
    for(let c=0;c<4;c++) {const delta=inside?Math.abs((reference.data[(y*reference.width+x)*4+c]??0)-(target.data[(y*target.width+x)*4+c]??0)):255;maximum=Math.max(maximum,delta);totalError+=delta;}
    const changed=maximum>tolerance;const index=(y*width+x)*4;
    data[index]=changed?255:reference.data[(y*reference.width+x)*4]??0;data[index+1]=changed?0:reference.data[(y*reference.width+x)*4+1]??0;data[index+2]=changed?80:reference.data[(y*reference.width+x)*4+2]??0;data[index+3]=255;
    if(changed){changedPixels++;const tx=Math.floor(x/64)*64,ty=Math.floor(y/64)*64,key=`${tx},${ty}`;const tile=tiles.get(key)??{x:tx,y:ty,width:Math.min(64,width-tx),height:Math.min(64,height-ty),changedPixels:0};tile.changedPixels++;tiles.set(key,tile);}
  }
  return {error:changedPixels/(width*height),meanAbsoluteError:totalError/(width*height*4*255),changedPixels,dimensionsMatch:reference.width===target.width&&reference.height===target.height,regions:[...tiles.values()],diff:{width,height,data}};
};
