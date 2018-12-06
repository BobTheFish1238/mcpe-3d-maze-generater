///////////////////////////////////////////////////////
//
//	Warning: This script was designed to be used with
//	Convarter, DO NOT load the script in any Minecraft
//	launcher! It would cause your app to stuck and
//	crash.
//
//	Download Convarter and compile from source:
//	https://github.com/oO0oO0oO0o0o00/Convarter
//	We may provide compiled version in the future.
//
//	DO NOT load the script in any Minecraft launcher!
//	DO NOT load the script in any Minecraft launcher!
//	DO NOT load the script in any Minecraft launcher!
///////////////////////////////////////////////////////

///////////////////////////
//	Configurable parameters

const START=[5,0,0];//Not used?
const TARGET=[15,3,20];
const XOFF=0;//Offset in blocks
const YOFF=63;
const ZOFF=0;

const WIDTH=20;//Unit: Grid(s)
const HEIGHT=4;

///////////////////////////////////////////////////////
//	Program Content

//Generating direction.
const XP=1;//X positive
const XN=-1;//X negative
const ZP=2;//...
const ZN=-2;
const XPU=5;//X positive upstair
const XNU=-5;//...
const ZPU=6;
const ZNU=-6;
const XPD=9;//X positive downstair
const XND=-9;//...
const ZPD=10;
const ZND=-10;

//Visited state
const VNULL=0;//Unvisited
const VFLAT=1;//Plain
const VXPU=12;//Is a stair going up on X positive
const VXNU=13;//...
const VZPU=14;
const VZNU=15;
const VXPR=6;//Space reserved for a stair, star marked:
//    *____
//____/
const VXNR=7;//...
const VZPR=8;
const VZNR=9;
const VDEAD=20;

//Wall states
const WNUL=0;//Nothing
const WDEF=1;//Fence
const WOFF=2;//Wall not present, connected
const WPUP=3;//Part of an upstair on X or Z positive
const WNUP=4;//...
const WPDN=5;//Downstair
const WNDN=6;//...
const WSTR=10;//Inside a stair, do nothing

//Stair types
const SXPU=1;
const SXNU=2;
const SZPU=3;
const SZNU=4;

//Blocks to be used:
const BFENCEI=85;
const BFENCED=0;
const BFLOORI=5;
const BFLOORD=0;
const BSTAIRXPI=53;
const BSTAIRXPD=0;
const BSTAIRXNI=53;
const BSTAIRXND=1;
const BSTAIRZPI=53;
const BSTAIRZPD=2;
const BSTAIRZNI=53;
const BSTAIRZND=3;

const RAND=new java.util.Random(XOFF*256+ZOFF*16+YOFF+2270);

var dlog=function(){}

var L;
var p_walls;
var visited;
var t0,t1;

function random(){
	return RAND.nextDouble();
}

function slog(str){
	java.lang.System.out.println(str);
}

Math.random=random;
Math.sign=function(num){
	if(num>0)return 1;
	if(num==0)return 0;
	return -1;
}

function randInt(a,b){
	if(b==null)return RAND.nextInt(a);
	return RAND.nextInt(b-a)+a;
}

function randDirsAfterStair(list){
	if(Math.random()<0.5)return list;
	var tmp=list[0];
	list[0]=list[1];
	list[1]=tmp;
	return list;
}

function randDirs(pos,dir){
	//The first step shouldn't be a stair:
	if(dir==null){
		slog("meow");
		return [XP,XN,ZP,ZN];//TODO: i want randomness..
	}
	//Choice after a stair is limited:
	switch(dir){
		case XPU:
			return randDirsAfterStair([XP,XPU]);
		case XNU:
			return randDirsAfterStair([XN,XNU]);
		case XPD:
			return randDirsAfterStair([XP,XPD]);
		case XND:
			return randDirsAfterStair([XN,XND]);
		case ZPU:
			return randDirsAfterStair([ZP,ZPU]);
		case ZNU:
			return randDirsAfterStair([ZN,ZNU]);
		case ZPD:
			return randDirsAfterStair([ZP,ZPD]);
		case ZND:
			return randDirsAfterStair([ZN,ZND]);
		default:
			break;
	}
	//Otherwise we can:
	var choices=[XP,XN,ZP,ZN,XPU,XNU,ZPU,ZNU,XPD,XND,ZPD,ZND];
	var weights=[8,8,8,8,1,1,1,1,1,1,1,1];
	var mask=[1,1,1,1,1,1,1,1,1,1,1,1];
	var xd=40*Math.sign(TARGET[0]-pos[0]);
	var yd=40*Math.sign(TARGET[1]-pos[1]);
	var zd=40*Math.sign(TARGET[2]-pos[2]);
	//Disable going back:
	switch(dir){
		case XP:
			mask[1]=0;
			mask[5]=0;
			mask[9]=0;
			break;
		case XN:
			mask[0]=0;
			mask[4]=0;
			mask[8]=0;
			break;
		case ZP:
			mask[3]=0;
			mask[7]=0;
			mask[11]=0;
			break;
		case ZN:
			mask[2]=0;
			mask[6]=0;
			mask[10]=0;
			break;
	}
	//Generate return value:
	var ret=[];
	for(var iter in choices){
		//Sum all weights of which has not been chosen or disabled:
		var sum=0;
		for(var i in mask){
			if(mask[i]==1)sum+=weights[i];
		}
		//Choose a number within 0~sum:
		var choice=random()*sum;
		sum=0;
		//Fell in which segment?
		for(var i in choices){
			//Already chosen or disabled option skipped.
			if(mask[i]!=1)continue;
			//Add up:
			sum+=weights[i];
			//If haven't reached:
			if(sum<=choice)continue;
			//Got it:
			ret.push(choices[i]);
			mask[i]=0;
			break;
		}
	}
	return ret;
}

function testRandDirs(){
	L="\n";
	for(var i=0;i<20;i++){
		var pos=[randInt(WIDTH),randInt(HEIGHT),randInt(WIDTH)];
		var dir=[XP,XN,ZP,ZN][randInt(4)];
		L+="["+pos+"],"+dir+": ";
		L+=randDirs(pos,dir);
		L+="\n";
	}
	log(L);
}

function initWalls(){
	p_walls=new Array(HEIGHT*(WIDTH+1)*WIDTH*2);
}

function getWallOffset(pos,direction){
	if((direction&1)==1){
		return (pos[1]*WIDTH+pos[2])*(1+WIDTH)+pos[0]+(direction>0?1:0);
	}else if((direction&2)==2){
		return HEIGHT*WIDTH*(WIDTH+1)+(pos[1]*WIDTH+pos[2]+(direction>0?1:0))*WIDTH+pos[0];
	}
	return -1;
}

function setWallOf(pos,direction,val){
	var offset=getWallOffset(pos,direction);
	if(offset<0)return false;
	if(p_walls[offset]>=val)return;
	p_walls[offset]=val;
	//dlog("setWallOf("+pos+","+direction+","+val+");");
}

function forceSetWallOf(pos,direction,val){
	var offset=getWallOffset(pos,direction);
	if(offset<0)return false;
	p_walls[offset]=val;
}

function getWallOf(pos,direction){
	var offset=getWallOffset(pos,direction);
	if(offset<0)return false;
	return p_walls[offset];
}

function testWalls(){
	initWalls();
	setWallOf(1,2,3,XP,1919);
	setWallOf(11,7,31,ZN,19);
	log(getWallOf(2,2,3,XN)==1919);
	log(getWallOf(11,7,31,ZN)==19);
	log(getWallOf(11,7,30,ZP)==19);
	log(false===setWallOf(-1,1,10,1,1));
	log(false===getWallOf(1,1,100,9));
}

function getVisited(pos){
	var val=visited[(pos[1]*WIDTH+pos[2])*WIDTH+pos[0]];
	if(null==val)return 0;
	return val;
}

function forceSetVisited(pos,val){
	var offset=(pos[1]*WIDTH+pos[2])*WIDTH+pos[0];
	var old=visited[offset];
	if(old==null || old==VNULL)t0++;
	visited[offset]=val;
}

function setVisited(pos,val){
	var offset=(pos[1]*WIDTH+pos[2])*WIDTH+pos[0];
	var old=visited[offset];
	if(old==null || val>old){
		if(old==null || old==VNULL)t0++;
		visited[offset]=val;
	}
}

//Try stair up..
//Using XP as the example here.
//rsvd: The acceptable reserved status, e.g. VXPR.
//ocpd: The acceptable occupied status, e.g. VXPU.
function tryToGoUpOrDown(base,rsvd,ocpd){
	//____/ V  ____/ X --We can stack only stairs of same directions together.
	//____/    ____\n  --Here we check for downward stacks.
	var symb=getVisited(base);
	if(symb!=VNULL && symb!=rsvd)return false;
	base[1]++;
	//Now to check upward stacks.
	symb=getVisited(base);
	if(symb!=VNULL && symb!=ocpd)return false;
	//When a position is both VXPR and VXPU the latter is preferred.
	if(symb!=ocpd)setVisited(base,rsvd);
	base[1]--;
	setVisited(base,ocpd);
	return true;
}

//If i returned non-null then you must follow..
function tryToGo(pos,dir){
	//else if(pos[0]==1 && pos[1]==0 && pos[2]==4 && dir==ZNU)log("222");
	var next;
	var symb;
	switch(dir){
		//For these 4 directions we only lookup 1 blk ahead.
		case XP:
			next=[pos[0]+1,pos[1],pos[2]];
			if(pos[0]+1>=WIDTH)return null;
			if(getVisited(next)==VNULL){
				setVisited(next,VFLAT);
				switch(getVisited(pos)){
					case VFLAT:
					//____
						setWallOf(pos,dir,WOFF);
						break;
					case VXPR:
					case VXPU:
					//   ___   /___
					//	/      /
						setWallOf(pos,dir,WNDN);
						break;
					case VXNU:
					//  \n____
						setWallOf(pos,dir,WNUP);
						break;
					default:
						slog("ERROR: "+dir);
						while(1){}
				}
				return next;
			}
			return null;
		case XN:
			next=[pos[0]-1,pos[1],pos[2]];
			if(pos[0]<1)return null;
			if(getVisited(next)==VNULL){
				setVisited(next,VFLAT);
				switch(getVisited(pos)){
					case VFLAT:
					//____
						setWallOf(pos,dir,WOFF);
						break;
					case VXNR:
					case VXNU:
					//   ___    ___\n
					//	    \n     \n
						setWallOf(pos,dir,WPDN);
						break;
					case VXPU:
					//  ____/
						setWallOf(pos,dir,WPUP);
						break;
				}
				return next;
			}
			return null;
		case ZP:
			next=[pos[0],pos[1],pos[2]+1];
			if(pos[2]+1>=WIDTH)return null;
			if(getVisited(next)==VNULL){
				setVisited(next,VFLAT);
				switch(getVisited(pos)){
					case VFLAT:
					//____
						setWallOf(pos,dir,WOFF);
						break;
					case VZPR:
					case VZPU:
					//   ___   /___
					//	/      /
						setWallOf(pos,dir,WNDN);
						break;
					case VZNU:
					//  \____
						setWallOf(pos,dir,WNUP);//if(pos[0]==1 && pos[1]==0 && pos[2]==3)log("3");
						break;
				}
				return next;
			}
			return null;
		case ZN:
			next=[pos[0],pos[1],pos[2]-1];
			if(pos[2]<1)return null;
			if(getVisited(next)==VNULL){
				setVisited(next,VFLAT);
				switch(getVisited(pos)){
					case VFLAT:
					//____
						setWallOf(pos,dir,WOFF);
						break;
					case VZNR:
					case VZNU:
					//   ___    ___\n
					//	    \n     \n
						setWallOf(pos,dir,WPDN);
						break;
					case VZPU:
					//  ____/
						setWallOf(pos,dir,WPUP);
						break;
				}
				return next;
			}
			return null;
		//Upstairs.
		case XPU:
			next=[pos[0]+1,pos[1],pos[2]];
			if(pos[0]+1>=WIDTH)return null;
			if(pos[1]+1>=HEIGHT)return null;
			if(!tryToGoUpOrDown(next,VXPR,VXPU))return null;
			next[1]++;
			switch(getVisited(pos)){
				case VFLAT:
					setWallOf(pos,dir,WPUP);
					break;
			}
			return next;
		case XNU:
			next=[pos[0]-1,pos[1],pos[2]];
			if(pos[0]<1)return null;
			if(pos[1]+1>=HEIGHT)return null;
			if(!tryToGoUpOrDown(next,VXNR,VXNU))return null;
			next[1]++;
			switch(getVisited(pos)){
				case VFLAT:
					setWallOf(pos,dir,WNUP);
					break;
			}
			return next;
		case ZPU:
			next=[pos[0],pos[1],pos[2]+1];
			if(pos[2]+1>=WIDTH)return null;
			if(pos[1]+1>=HEIGHT)return null;
			if(!tryToGoUpOrDown(next,VZPR,VZPU))return null;
			next[1]++;
			switch(getVisited(pos)){
				case VFLAT:
					setWallOf(pos,dir,WPUP);
					break;
			}
			return next;
		case ZNU:
			next=[pos[0],pos[1],pos[2]-1];
			if(pos[2]<1)return null;
			if(pos[1]+1>=HEIGHT)return null;
			if(!tryToGoUpOrDown(next,VZNR,VZNU))return null;
			next[1]++;
			switch(getVisited(pos)){
				case VFLAT:
					setWallOf(pos,dir,WNUP);
					break;
			}
			return next;
		//Downstairs.
		case XPD:
			next=[pos[0]+1,pos[1]-1,pos[2]];
			if(pos[0]+1>=WIDTH)return null;
			if(pos[1]<1)return null;
			if(!tryToGoUpOrDown(next,VXNR,VXNU))return null;
			switch(getVisited(pos)){
				case VFLAT:
					setWallOf(pos,dir,WPDN);
					break;
			}
			return next;
		case XND:
			next=[pos[0]-1,pos[1]-1,pos[2]];
			if(pos[0]<1)return null;
			if(pos[1]<1)return null;
			if(!tryToGoUpOrDown(next,VXPR,VXPU))return null;
			switch(getVisited(pos)){
				case VFLAT:
					setWallOf(pos,dir,WNDN);
					break;
			}
			return next;
		case ZPD:
			next=[pos[0],pos[1]-1,pos[2]+1];
			if(pos[2]+1>=WIDTH)return null;
			if(pos[1]<1)return null;
			if(!tryToGoUpOrDown(next,VZNR,VZNU))return null;
			switch(getVisited(pos)){
				case VFLAT:
					setWallOf(pos,dir,WPDN);
					break;
			}
			return next;
		case ZND:
			next=[pos[0],pos[1]-1,pos[2]-1];
			if(pos[2]<1)return null;
			if(pos[1]<1)return null;
			if(!tryToGoUpOrDown(next,VZPR,VZPU))return null;
			switch(getVisited(pos)){
				case VFLAT:
					setWallOf(pos,dir,WNDN);
					break;
			}
			return next;
		default:
			return null;
	}
}

function done(curr){
	if(null==curr)return false;
	return Math.abs(curr[0]-TARGET[0])<2 && 
		Math.abs(curr[1]-TARGET[1])<2 &&
		Math.abs(curr[2]-TARGET[2])<2;
}

function isStair(curr){
	var val=getVisited(curr);
	if(val==VXPU || val==VXPR || val==VXNU || val==VXNR)return true;
	if(val==VZPU || val==VZPR || val==VZNU || val==VZNR)return true;
	return false;
}

function removeStair(curr,dir){
	var another;slog("233;"+curr);
	switch(dir){
		case XPU:
		case XNU:
		case ZPU:
		case ZNU:
			//Then we're on the top part.
			//The top part is only removed if not stacked with another stair.
			switch(getVisited(curr)){
				case VXPU:
				case VXNU:
				case VZPU:
				case VZNU:
					//Stacked, don't modify.
					break;
				default:
					forceSetVisited(curr,VNULL);
			}
			//The bottom part should be removed.
			//"A death is such null that cannot be revived."
			another=[curr[0],curr[1]-1,curr[2]]
			setVisited(another,VDEAD);
			break;
		default:
			//Then we're on the bottom part.
			setVisited(curr,VDEAD);
			another=[curr[0],curr[1]+1,curr[2]];
			switch(getVisited(another)){
				case VXPU:
				case VXNU:
				case VZPU:
				case VZNU:
					//Stacked, don't modify.
					break;
				default:
					forceSetVisited(another,VNULL);
			}
	}
	//Recover border
	switch(dir){
		case XPU:
			forceSetWallOf(another,XN,WNUL);
			break;
		case XNU:
			forceSetWallOf(another,XP,WNUL);
			break;
		case ZPU:
			forceSetWallOf(another,ZN,WNUL);
			break;
		case ZNU:
			forceSetWallOf(another,ZP,WNUL);
			break;
		case XPD:
			forceSetWallOf(another,XN,WNUL);
			break;
		case XND:
			forceSetWallOf(another,XP,WNUL);
			break;
		case ZPD:
			forceSetWallOf(another,ZN,WNUL);
			break;
		case ZND:
			forceSetWallOf(another,ZP,WNUL);
			break;
	}
}

function generate(){
	t0=0;
	var stack=[];
	var dirs;
	var i=-1;
	var curr=START;
	setVisited(curr,VFLAT);
	//Dir is only used within loops indicating newly started function.
	var dir;
	var fails;//How many childs of a stair has failed?
	var ret;//Simulates the return value
	loop:
	while(true){
		slog("tot "+t0);
		//If this is "newly started", dirs would be generated here:
		if(i==-1){
			dirs=randDirs(curr,dir);
			fails=0;
			i=0;
			//slog("->{");
		//If a child of a stair returned failure it's fails count +1.
		}else if(ret==2 && isStair(curr)){
			fails++;
		}
		//Otherwise dirs should have been populated before our arrival.
		//Iterate dirs, continue from a previous i:
		for(;i<dirs.length;i++){
			//Can we go there? If not, continue for loop.
			dir=dirs[i];
			var next=tryToGo(curr,dir);
			if(null==next){
				//If a stair can't spawn a child its fails count +1.
				if(isStair(curr))fails++;
				continue;
			}
			//slog(""+curr+": "+dir);
			//Equal to saving context:
			stack.push(curr);
			stack.push(dirs);
			stack.push(i+1);
			stack.push(fails);
			//On going direction:
			curr=next;
			i=-1;
			//Equal to recursive call:
			continue loop;
		}
		//Restore context:
		if(stack.length==0)break;
		ret=fails;fails=0;
		fails=stack.pop();
		i=stack.pop();
		dirs=stack.pop();
		if(ret>=2 && isStair(curr)){L++;
			removeStair(curr,dirs[i-1]);
		}
		curr=stack.pop();
		//slog("}<-");
	}
}//var setTile=function(){};
var K=0;
function stair(pos,dir){
	slog("stair "+pos);
	var x=pos[0]*15+XOFF;
	var z=pos[2]*15+ZOFF;
	var y=pos[1]*15+YOFF;
	switch(dir){
		case SXPU:
			for(var j=0;j<=14;j++){
				setTile(x+j,y+j,z+5,BFLOORI,BFLOORD);
				setTile(x+j,y+j,z+9,BFLOORI,BFLOORD);
				setTile(x+j,y+j+1,z+5,BFENCEI,BFENCED);
				setTile(x+j,y+j+1,z+9,BFENCEI,BFENCED);
				setTile(x+j,y+j+2,z+5,BFENCEI,BFENCED);
				setTile(x+j,y+j+2,z+9,BFENCEI,BFENCED);
			}
			for(var j=1;j<=15;j++){
				for(var i=6;i<=8;i++)
					setTile(x+j,y+j,z+i,BSTAIRXPI,BSTAIRXPD);
			}
			break;
		case SXNU:
			for(var j=0;j<=14;j++){
				setTile(x+j,y+14-j,z+5,BFLOORI,BFLOORD);
				setTile(x+j,y+14-j,z+9,BFLOORI,BFLOORD);
				setTile(x+j,y+15-j,z+5,BFENCEI,BFENCED);
				setTile(x+j,y+15-j,z+9,BFENCEI,BFENCED);
				setTile(x+j,y+16-j,z+5,BFENCEI,BFENCED);
				setTile(x+j,y+16-j,z+9,BFENCEI,BFENCED);
			}
			for(var j=-1;j<=13;j++){
				for(var i=6;i<=8;i++)
					setTile(x+j,y+14-j,z+i,BSTAIRXNI,BSTAIRXND);
			}
			break;
		case SZPU:
			for(var j=0;j<=14;j++){
				setTile(x+5,y+j,z+j,BFLOORI,BFLOORD);
				setTile(x+9,y+j,z+j,BFLOORI,BFLOORD);
				setTile(x+5,y+j+1,z+j,BFENCEI,BFENCED);
				setTile(x+9,y+j+1,z+j,BFENCEI,BFENCED);
				setTile(x+5,y+j+2,z+j,BFENCEI,BFENCED);
				setTile(x+9,y+j+2,z+j,BFENCEI,BFENCED);
			}
			for(var j=1;j<=15;j++){
				for(var i=6;i<=8;i++)
					setTile(x+i,y+j,z+j,BSTAIRZPI,BSTAIRZPD);
			}
			break;
		case SZNU:
			for(var j=0;j<=14;j++){
				setTile(x+5,y+14-j,z+j,BFLOORI,BFLOORD);
				setTile(x+9,y+14-j,z+j,BFLOORI,BFLOORD);
				setTile(x+5,y+15-j,z+j,BFENCEI,BFENCED);
				setTile(x+9,y+15-j,z+j,BFENCEI,BFENCED);
				setTile(x+5,y+16-j,z+j,BFENCEI,BFENCED);
				setTile(x+9,y+16-j,z+j,BFENCEI,BFENCED);
			}
			for(var j=-1;j<=13;j++){
				for(var i=6;i<=8;i++)
					setTile(x+i,y+14-j,z+j,BSTAIRZNI,BSTAIRZND);
			}
			break;
	}
	linedown:{
		if(pos[1]==0)break linedown;
		var pdn=[pos[0],pos[1]-1,pos[2]];
		switch(getVisited(pdn)){
			case VXPU:
			case VXNU:
			case VZPU:
			case VZNU:
				break linedown;
		}
		var down;
		switch(dir){
			case SXPU:
			case SXNU:
				down=randDirsAfterStair([ZP,ZN]);
				break;
			case SZPU:
			case SZNU:
				down=randDirsAfterStair([XP,XN]);
				break;
			default:
				break linedown;
		}
		var ddir=null;
		linedownfor:{
			for(var i in down){
				switch(getWallOf(pdn,down[i])){
					case WOFF:
						continue;
					default:
						ddir=down[i];
						break linedownfor;
				}
			}
		}
		if(ddir==null)break linedown;
		slog("233 "+ddir);K++;
		var lx=x+7;
		var lz=z+7;
		var ly=y+5;
		switch(ddir){
			case XP:
				lx+=2;
				break;
			case XN:
				lx-=2;
				break;
			case ZP:
				lz+=2;
				break;
			case ZN:
				lz-=2;
				break;
		}
		for(var i=0;i<15;i++){
			setTile(lx,ly-i,lz,BFENCEI,BFENCED);
		}
		setTile(lx,ly-15,lz,89);
	}
}

function road(pos){
	slog("road "+pos);
	var xoff=pos[0]*15+XOFF;
	var y=pos[1]*15+YOFF;
	var zoff=pos[2]*15+ZOFF;
	for(var x=5;x<=9;x++){
		for(var z=5;z<=9;z++){
			setTile(x+xoff,y,z+zoff,BFLOORI,BFLOORD);
		}
	}
	setTile(xoff+5,y+1,zoff+5,BFENCEI,BFENCED);
	setTile(xoff+5,y+1,zoff+9,BFENCEI,BFENCED);
	setTile(xoff+9,y+1,zoff+5,BFENCEI,BFENCED);
	setTile(xoff+9,y+1,zoff+9,BFENCEI,BFENCED);
	y++;
	var w;
	switch(getWallOf(pos,XP)){
		case WOFF:
		case WPUP:
		case WPDN:
			break;
		default:
			w=xoff+9;
			for(var i=5;i<=9;i++)
				setTile(w,y,zoff+i,BFENCEI,BFENCED);
			break;
	}
	switch(getWallOf(pos,XN)){
		case WOFF:
		case WNUP:
		case WNDN:
			break;
		default:
			w=xoff+5;
			for(var i=5;i<=9;i++)
				setTile(w,y,zoff+i,BFENCEI,BFENCED);
			break;
	}
	switch(getWallOf(pos,ZP)){
		case WOFF:
		case WPUP:
		case WPDN:
			break;
		default:
			w=zoff+9;
			for(var i=5;i<=9;i++)
				setTile(xoff+i,y,w,BFENCEI,BFENCED);
			break;
	}
	switch(getWallOf(pos,ZN)){
		case WOFF:
		case WNUP:
		case WNDN:
			break;
		default:
			w=zoff+5;
			for(var i=5;i<=9;i++)
				setTile(xoff+i,y,w,BFENCEI,BFENCED);
			break;
	}
}

function build(){var meow=0;
	//Build these walls:
	for(var y=0;y<HEIGHT;y++){
		var ay=y*15+YOFF;
		for(var z=0;z<WIDTH;z++){
			var az=z*15+ZOFF;
			for(var x=-1;x<WIDTH;x++){
				var ax=x*15+XOFF;
				switch(getWallOf([x,y,z],XP)){
					case WNUL:
						break;
					case WOFF:
						for(var j=10;j<=19;j++){
							for(var i=5;i<=9;i++)
								setTile(ax+j,ay,az+i,BFLOORI,BFLOORD);
							setTile(ax+j,ay+1,az+5,BFENCEI,BFENCED);
							setTile(ax+j,ay+1,az+9,BFENCEI,BFENCED);
						}
						break;
					case WPUP:
						for(var j=10;j<=15;j++){
							for(var i=5;i<=9;i++)
								setTile(ax+j,ay,az+i,BFLOORI,BFLOORD);
							setTile(ax+j,ay+1,az+5,BFENCEI,BFENCED);
							setTile(ax+j,ay+1,az+9,BFENCEI,BFENCED);
						}
						break;
					case WPDN:
						for(var j=10;j<=14;j++){
							for(var i=5;i<=9;i++)
								setTile(ax+j,ay,az+i,BFLOORI,BFLOORD);
							setTile(ax+j,ay+1,az+5,BFENCEI,BFENCED);
							setTile(ax+j,ay+1,az+9,BFENCEI,BFENCED);
						}
						break;
					case WNUP:
						for(var j=14;j<=19;j++){
							for(var i=5;i<=9;i++)
								setTile(ax+j,ay,az+i,BFLOORI,BFLOORD);
							setTile(ax+j,ay+1,az+5,BFENCEI,BFENCED);
							setTile(ax+j,ay+1,az+9,BFENCEI,BFENCED);
						}
						break;
					case WNDN:
						for(var j=15;j<=19;j++){
							for(var i=5;i<=9;i++)
								setTile(ax+j,ay,az+i,BFLOORI,BFLOORD);
							setTile(ax+j,ay+1,az+5,BFENCEI,BFENCED);
							setTile(ax+j,ay+1,az+9,BFENCEI,BFENCED);
						}
						break;
				}
			}
		}
	}
	for(var y=0;y<HEIGHT;y++){
		var ay=y*15+YOFF;
		for(var z=-1;z<WIDTH;z++){
			var az=z*15+ZOFF;
			for(var x=0;x<WIDTH;x++){
				var ax=x*15+XOFF;
				switch(getWallOf([x,y,z],ZP)){
					case WNUL:
						break;
					case WOFF:
						for(var j=10;j<=19;j++){
							for(var i=5;i<=9;i++)
								setTile(ax+i,ay,az+j,BFLOORI,BFLOORD);
							setTile(ax+5,ay+1,az+j,BFENCEI,BFENCED);
							setTile(ax+9,ay+1,az+j,BFENCEI,BFENCED);
						}
						break;
					case WPUP:
						for(var j=10;j<=15;j++){
							for(var i=5;i<=9;i++)
								setTile(ax+i,ay,az+j,BFLOORI,BFLOORD);
							setTile(ax+5,ay+1,az+j,BFENCEI,BFENCED);
							setTile(ax+9,ay+1,az+j,BFENCEI,BFENCED);
						}
						break;
					case WPDN:
						for(var j=10;j<=14;j++){
							for(var i=5;i<=9;i++)
								setTile(ax+i,ay,az+j,BFLOORI,BFLOORD);
							setTile(ax+5,ay+1,az+j,BFENCEI,BFENCED);
							setTile(ax+9,ay+1,az+j,BFENCEI,BFENCED);
						}
						break;
					case WNUP:
						for(var j=14;j<=19;j++){
							for(var i=5;i<=9;i++)
								setTile(ax+i,ay,az+j,BFLOORI,BFLOORD);
							setTile(ax+5,ay+1,az+j,BFENCEI,BFENCED);
							setTile(ax+9,ay+1,az+j,BFENCEI,BFENCED);
						}
						break;
					case WNDN:
						for(var j=15;j<=19;j++){
							for(var i=5;i<=9;i++)
								setTile(ax+i,ay,az+j,BFLOORI,BFLOORD);
							setTile(ax+5,ay+1,az+j,BFENCEI,BFENCED);
							setTile(ax+9,ay+1,az+j,BFENCEI,BFENCED);
						}
						break;
				}
			}
		}
	}
	//Build cells:
	for(var gy=0;gy<HEIGHT;gy++)
		for(var gz=0;gz<WIDTH;gz++)
			for(var gx=0;gx<WIDTH;gx++){
				var pos=[gx,gy,gz];
				switch(getVisited(pos)){
					case VNULL:
						continue;
					case VFLAT:
						road(pos);
						break;
					case VXPU:
						stair(pos,SXPU);
						break;
					case VXNU:
						stair(pos,SXNU);
						break;
					case VZPU:
						stair(pos,SZPU);
						break;
					case VZNU:
						stair(pos,SZNU);
						break;
					case VDEAD:
						//setTile(15*gx+7,15*gy+7,15*gz+7,35,3);
						meow++
						break;
				}
			}
	slog("meow="+meow);
	log("meow="+meow);
}

function main(){
	//dlog=function(s){slog(s);};
	visited=new Array(WIDTH*WIDTH*HEIGHT);
	initWalls();
	L=0;
	generate();
	build();
	slog("nya"+L);log("2345 "+K);
}

main();

/////////////////////////////////////////////////////////
