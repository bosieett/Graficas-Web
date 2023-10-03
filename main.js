import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CharacterControls } from './CharacterControl.js';


//Esenciales
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.x=0;
camera.position.y=10;
camera.position.z=10;
let light = new THREE.DirectionalLight(0xffffff, 1.0);
scene.add(light);
let light2 = new THREE.AmbientLight(0x101010);
scene.add(light2);
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


//Movimiento de camara
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping=true;
controls.minDistance=5;
controls.maxDistance=15;
controls.enablePan=false;
controls.maxPolarAngle=Math.PI/2-0.05
controls.update();

//Personaje
var charactercontrols
new GLTFLoader().load('Panda.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) object.castShadow=true;
    });
    console.log(model);
    scene.add(model);
    const gltfAnimations=gltf.animations;
    const mixer=new THREE.AnimationMixer(model);
    const animationMap=new Map();
    gltfAnimations.filter(a=>a.name!=!'TPose').forEach((a)=>{
        animationMap.set(a.name,mixer.clipAction(a))
    })
    charactercontrols=new CharacterControls(model,mixer, animationMap, controls,camera, 'Idle')
});

//Skybox
new THREE.TextureLoader().load("wallpaper.png",(texture)=>{
    const rt= new THREE.WebGLCubeRenderTarget(3072);
    rt.fromEquirectangularTexture(renderer, texture)
    scene.background=rt.texture;
})

const clock = new THREE.Clock();

function animate() {
	requestAnimationFrame( animate );
    if(charactercontrols)
        charactercontrols.update(clock.getDelta());
    controls.update();
	renderer.render( scene, camera );
}

animate();