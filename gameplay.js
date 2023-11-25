import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CharacterControls } from './CharacterControl.js';

//Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    FacebookAuthProvider 
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    onValue,
    set
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {

    apiKey: "AIzaSyAu7KPLa2vQ_HDXEC25WCXh-A4a4gZVS4A",
  
    authDomain: "piagraficasweb-5905f.firebaseapp.com",
  
    projectId: "piagraficasweb-5905f",
  
    storageBucket: "piagraficasweb-5905f.appspot.com",
  
    messagingSenderId: "82150438327",
  
    appId: "1:82150438327:web:2750244f471b1c55bb6432"
  
  };
  
  
//Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);
auth.languageCode = 'es';
const provider = new GoogleAuthProvider();
const providerFB = new FacebookAuthProvider();

const db = getDatabase();
let currentUser;

async function login() {
    await signInWithPopup(auth, provider)
        .then((result) => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            // The signed-in user info.
            currentUser = result.user;
            console.log(currentUser);
            writeUserData(currentUser.uid, 0, 0);
            localStorage.setItem('currentPlayer', currentUser.uid)
        }).catch((error) => {
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            // The email of the user's account used.
            const email = error.customData.email;
            // The AuthCredential type that was used.
            const credential = GoogleAuthProvider.credentialFromError(error);
            console.log(error);
            // ...
        });
}

async function loginFB() {
    await signInWithPopup(auth, providerFB)
        .then((result) => {
            console.log(result);
            const credentialFB = FacebookAuthProvider.credentialFromResult(result);
            const tokenFB = credentialFB.accessToken;
            // The signed-in user info.
            currentUser = result.user;
            console.log(currentUser);
            writeUserData(currentUser.uid, 0, 0);
            localStorage.setItem('currentPlayer', currentUser.uid)
            console.log('facebook signIn')
        }).catch((error) => {
            console.log(error);
        });
}

const currentPlayer = localStorage.getItem('currentPlayer');
const buttonLogin = document.getElementById('button-login');
const buttonLogout = document.getElementById('button-logout');
const buttonLoginFB = document.getElementById('button-loginFB');
if(buttonLogin != null && buttonLogout != null && buttonLoginFB != null) {
    buttonLogin.addEventListener('click',async()=> {
        await login();
    })
    buttonLoginFB.addEventListener('click',async()=> {
        await loginFB();
    })
    buttonLogout.addEventListener('click',async()=> {
        await signOut(auth).then(() => {
            console.log('Sign-out succesful.');
          }).catch((error) => {
            console.log('An error happened.')
          });
    })
}

/*
const buttonLoginFB = document.querySelector('#button-loginFB');
buttonLoginFB.addEventListener('click', e => {
    e.preventDefault();
    signInWithPopup(auth, providerFB)
        .then(result => {
            console.log(result);
            console.log('facebook signIn')
        }).catch(error => {
            console.log(error);
        });
})
*/
//Esenciales
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.x=0;
camera.position.y=10;
camera.position.z=50;
let light = new THREE.DirectionalLight(0xffffff, 0.5);
scene.add(light);
let light2 = new THREE.AmbientLight(0xd58cff);
scene.add(light2);
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

//Skybox
new THREE.TextureLoader().load("skibox.jpg",(texture)=>{
    const rt= new THREE.WebGLCubeRenderTarget(3072);
    rt.fromEquirectangularTexture(renderer, texture)
    scene.background=rt.texture;
})

//Plano
/*
const geometry = new THREE.PlaneGeometry( 300, 300 );
const material = new THREE.MeshBasicMaterial( {color: 'grey', side: THREE.DoubleSide} );
const plane = new THREE.Mesh( geometry, material );
plane.rotation.x = Math.PI * 0.5
scene.add( plane );
*/

//Modelo del mapa
 new GLTFLoader().load('scenary.glb', function(gltf){
    scene.add(gltf.scene);
 });

var charactercontrols;

//Escribir
function writeUserData(userId, positionX, positionZ) {
    set(ref(db, 'players/' + userId), {
        x: positionX,
        z: positionZ
    });
}

//Leer
const starCountRef = ref(db, 'players');
onValue(starCountRef, (snapshot) => {
    const data = snapshot.val();
    
    Object.entries(data).forEach(([key, value]) => {
        console.log(`${key} ${value.x} ${value.z}`);
        
        const player = scene.getObjectByName(key);

        if(!player) {           
            new GLTFLoader().load('Panda.gltf', function(gltf){
                const model = gltf.scene;
                model.traverse(object=>{
                    if(object.isMesh) {
                        object.castShadow=true;
                    } 
                });
                model.position.set(value.x,0,value.z);
                model.name = key;
                //Animaciones
                const gltfAnimations=gltf.animations;
                const mixer=new THREE.AnimationMixer(model);
                const animationMap=new Map();
                gltfAnimations.filter(a=>a.name!=!'TPose').forEach((a)=>{
                    animationMap.set(a.name,mixer.clipAction(a))
                })
                if(model.name == currentPlayer) {
                    charactercontrols = new CharacterControls(model, mixer, animationMap, controls, camera, 'Idle')
                }
                scene.add(model);
            });
        }
        else { 
            scene.getObjectByName(key).position.x = value.x;
            scene.getObjectByName(key).position.z = value.z;
        }
    });
});

const clock = new THREE.Clock();

//Movimiento de camara
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping=true;
controls.minDistance=40;
controls.maxDistance=40;
controls.enablePan=true;
controls.autorotate=false;
controls.enableRotate=false;
controls.maxPolarAngle=Math.PI/2-0.05;
controls.update();


function animate() {
    requestAnimationFrame(animate);
    if(charactercontrols) {
        charactercontrols.update(clock.getDelta());
        if(charactercontrols.model.name == currentPlayer) {
            writeUserData(localStorage.getItem("currentPlayer"),charactercontrols.getPosX(),charactercontrols.getPosZ());
        }
    }
    controls.update();
    renderer.render( scene, camera );
}

if(localStorage.getItem("currentPlayer")) {
    animate();
}

