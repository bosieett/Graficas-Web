import * as THREE from 'three';
const DIRECTIONS=['w','a','s','d']
export class CharacterControls{
    constructor(model,mixer, animationMap, orbitcontrols,camera, currentAction){
        this.model=model;
        this.mixer=mixer;
        this.model.position.y=0.5;
        this.currentAction=currentAction;
        this.animationMap=animationMap;
        this.animationMap.forEach((value,key)=>{
            if(key==currentAction){
                value.play();
            }
        });
        this.orbitcontrols=orbitcontrols;
        this.camera=camera;
        this.toggleRun=true;
        
        this.prevX= model.position.x;

        this.prevZ= model.position.z;

        //this.updateCameraTarget(0,0)
        //
        this.walkDirection=new THREE.Vector3();
        this.rotateAngle=new THREE.Vector3(0,1,0);
        this.rotateQuaternion=new THREE.Quaternion();
        this.cameraTarget= new THREE.Vector3();

        //
        this.fadeDuration=0.2;
        this.runVelocity=10;
        this.walkVelocity=8;



        //
        
this.keypressed={
    adelante:false,
    atras:false,
    izq:false,
    der:false,
    shift:false,
    cortar:false
}
document.addEventListener('keydown',(e)=>this._onKeyDown(e),false);
      document.addEventListener('keyup',(e)=>this._onKeyUp(e),false);
     
    }
    _onKeyDown(event){
        switch(event.keyCode){
          case 87:
            this.keypressed.adelante=true;
            break;
            case 65:
            this.keypressed.izq=true;
            break;
            case 83:
            this.keypressed.atras=true;
            break;
            case 68:
            this.keypressed.der=true;
            break;
            case 32:
            this.keypressed.cortar=true;
            break;
            case 16:
            this.keypressed.shift=true;
            break;
        }}
        _onKeyUp(event){
          switch(event.keyCode){
            case 87:
                this.keypressed.adelante=false;
                break;
                case 65:
                this.keypressed.izq=false;
                break;
                case 83:
                this.keypressed.atras=false;
                break;
                case 68:
                this.keypressed.der=false;
                break;
                case 32:
                this.keypressed.cortar=false;
                break;
                case 16:
                this.keypressed.shift=false;
                break;
          }
      }
    
      directionOffset(){
        var directionOffset=0;
        if(this.keypressed.atras){
            if(this.keypressed.der){
                directionOffset=Math.PI/4
            }
            else if(this.keypressed.izq){
                directionOffset=-Math.PI/4
            }
        } else if(this.keypressed.adelante){
            if(this.keypressed.der){
                directionOffset=Math.PI/4+Math.PI/2
            }
            else if(this.keypressed.izq){
                directionOffset=-Math.PI/4-Math.PI/2
            }
            else{
                directionOffset=Math.PI
            }
        } else if(this.keypressed.der){directionOffset=Math.PI/2}
        else if(this.keypressed.izq){
            directionOffset=-Math.PI/2
        }
        return directionOffset;
      }

    switchRunToggle(){
        this.toggleRun=!this.toggleRun;
    }
    updateCameraTarget(moveX,moveZ){
        this.camera.position.x+=moveX;
        this.camera.position.z+=moveZ;
        this.cameraTarget.x=this.model.position.x;
        this.cameraTarget.y=this.model.position.y+1;
        this.cameraTarget.z=this.model.position.z;
        this.orbitcontrols.target=this.cameraTarget;
    }
    update(delta){
        var play='';
       
        if(this.keypressed.adelante||this.keypressed.atras||this.keypressed.izq||this.keypressed.der){
            play='Walk';
            if(this.keypressed.shift==true){
                play='Run';
            }
        }else{
            play='Idle';
        }
        if(this.currentAction!=play){
            const toPlay=this.animationMap.get(play);
            const current=this.animationMap.get(this.currentAction);
            current.fadeOut(this.fadeDuration);
            toPlay.reset().fadeIn(this.fadeDuration).play();
            this.currentAction=play;
        }

        this.mixer.update(delta);

        if(this.currentAction=='Run'||this.currentAction=='Walk'){
            this.prevX=this.model.position.x;
            this.prevZ=this.model.position.z;
            var angleYCameraDirection=Math.atan2(
                (this.camera.position.x-this.model.position.x),
                (this.camera.position.z-this.model.position.z)
            )
                var directionOffset=this.directionOffset();
                this.rotateQuaternion.setFromAxisAngle(this.rotateAngle,directionOffset);
                this.model.quaternion.rotateTowards(this.rotateQuaternion,0.2)
                this.camera.getWorldDirection(this.walkDirection);
                this.walkDirection.y=0;
                this.walkDirection.normalize();
                this.walkDirection.applyAxisAngle(this.rotateAngle,directionOffset);
                const velocity=this.currentAction=='Run'?this.runVelocity:this.walkVelocity
                const moveX=this.walkDirection.x*velocity*delta;
                const moveZ=this.walkDirection.z*velocity*delta;
                this.model.position.x-=moveX;
                this.model.position.z-=moveZ;
                // this.updateCameraTarget(moveX,moveZ);
        }
    }
    getUID() {
        return this.model.name;
    }
    getPosX() {
        return this.model.position.x;
    }
    getPosZ() {
        return this.model.position.z;
    }
     getPrevPosX() {
        return this.prevX;
    }
    
     getPrevPosZ() {
        return this.prevZ;
    }
    setPrevPos(){
        this.model.position.x= this.getPrevPosX()
        
        this.model.position.z= this.getPrevPosZ()
    }
}