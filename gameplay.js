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

const statsPlayer = {
    uid : localStorage.getItem('currentPlayer'),
    name : localStorage.getItem('currentPlayerName'),
    pts : 0,
    inventory : {
        items : [],
        dishes: []
    },
    position : {
        x : 0,
        z : 0
    } 
}


async function login() {
    await signInWithPopup(auth, provider)
        .then((result) => {

            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;

            // The signed-in user info.
            currentUser = result.user;
            writeUserData(currentUser.uid, 0, 0);

            localStorage.setItem('currentPlayer', currentUser.uid)
            localStorage.setItem('currentPlayerName', currentUser.displayName)

            statsPlayer.uid = currentUser.uid
            statsPlayer.name = currentUser.displayName
            statsPlayer.pts = 0
            statsPlayer.inventory = { items : [], dishes : []}

            printStats()

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
            console.log('facebook signIn')
        }).catch((error) => {
            console.log(error);
        });
}

const currentPlayer = localStorage.getItem('currentPlayer');
const currentPlayerName = localStorage.getItem('currentPlayerName');
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
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.x=0;
camera.position.y=40;
camera.position.z=30;
let light = new THREE.DirectionalLight(0xffffff, 0.5);
scene.add(light);
let light2 = new THREE.AmbientLight(0xd58cff);
scene.add(light2);
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.getElementById('gameplay-container').appendChild( renderer.domElement );

const cubeGeometry = new THREE.BoxGeometry(3, 3, 3);
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff1000 });

const ingredients = [
    {
        "name": "Arroz",
        "position": {"x": 5, "z": 5},
    },
    {
        "name": "Algas",
        "position": {"x": 10, "z": -10},
    },
    {
        "name": "Salmon",
        "position": {"x": -10, "z": -5},
    }
]

const dishes = [
    {
        "name": "Plato vacio",
        "ingredients": [],
    },
    {
        "name": "Sushi",
        "ingredients": [
            ingredients[0],
            ingredients[1],
            ingredients[2],
        ]
    }
]

const platoMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
platoMesh.position.x = -5;
platoMesh.position.z = -4;
let platoBB = new THREE.Box3().setFromObject(platoMesh);
scene.add(platoMesh);

const arrozMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
arrozMesh.position.x = ingredients[0].position.x;
arrozMesh.position.z = ingredients[0].position.z;
let arrozBB = new THREE.Box3().setFromObject(arrozMesh);
scene.add(arrozMesh);

const algasMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
algasMesh.position.x = ingredients[1].position.x;
algasMesh.position.z = ingredients[1].position.z;
let algasBB = new THREE.Box3().setFromObject(algasMesh);
scene.add(algasMesh);

const salmonMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
salmonMesh.position.x = ingredients[2].position.x;
salmonMesh.position.z = ingredients[2].position.z;
let salmonBB = new THREE.Box3().setFromObject(salmonMesh);
scene.add(salmonMesh);

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

//Colisiones del mapa
var mapColissions=[]

//Qué mapa elegir
function chooseMap(numero){
    const nivel={
    1:'Mapas/GCWFirstMap.glb',
    2: 'Mapas/GCWSecondMap.glb',
    3: 'Mapas/GCWThirdMap.glb'
}
    const nivelDefault='Mapas/GCWFirstMap.glb';
    let nivelJugar=nivel[numero]||nivelDefault;
    return nivelJugar
}

//Modelo del mapa
 new GLTFLoader().load(chooseMap(2), function(gltf){
     
    gltf.scene.position.x = 2;
    gltf.scene.position.z = 10;
    gltf.scene.traverse((hijo)=>{
       
      let cube2BB = new THREE.Box3();
      cube2BB.setFromObject(hijo);
    /*
        Para ver las colisiones del mapa
        const helper = new THREE.Box3Helper( cube2BB, 0xffff00 );
        scene.add( helper );
    */
      mapColissions.push(cube2BB);
    })
    scene.add(gltf.scene);
 });

var charactercontrols;

//Escribir
function writeUserData(userId, positionX, positionZ) {
    set(ref(db, 'players/' + userId), {
        x: positionX,
        z: positionZ
    });
    //console.log(positionX,positionZ)
}

//Leer
const starCountRef = ref(db, 'players');
onValue(starCountRef, (snapshot) => {
    const data = snapshot.val();
    
    Object.entries(data).forEach(([key, value]) => {
        // console.log(`${key} ${value.x} ${value.z}`);
        
        const player = scene.getObjectByName(key);

        if(!player) {           
            new GLTFLoader().load('Panda.gltf', function(gltf){
                const model = gltf.scene;
                model.traverse(object=>{
                    if(object.isMesh) {
                        if(object.name=="Knife")object.visible=false;
                        object.castShadow=true;
                    } 
                });
                model.position.set(value.x,0,value.z);
                model.name = key;
                // Animaciones
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

function checkCollisions(modelBB) {
    if(modelBB.intersectsBox(platoBB)){
        showAlert('press-button', "PULSA E PARA RECOGER EL PLATO")
        pickItem('dish', dishes[0])
        dropItem('dish', dishes[0])
    }
    else if(modelBB.intersectsBox(arrozBB)){
        showAlert('press-button', "PULSA E PARA RECOGER EL ARROZ")
        pickItem('ingredient', ingredients[0])
    }
    else if(modelBB.intersectsBox(algasBB)){
        showAlert('press-button', "PULSA E PARA RECOGER LAS ALGAS")
        pickItem('ingredient', ingredients[1])
    }
    else if(modelBB.intersectsBox(salmonBB)){
        showAlert('press-button', "PULSA E PARA RECOGER EL SALMON")
        pickItem('ingredient', ingredients[2])
    }
    mapColissions.forEach((element,iterador) => {
        if(iterador!=0)
        if(modelBB.intersectsBox(element)){
          charactercontrols.setPrevPos();
        }
    });
}

function pickItem(itemType,item) {

    document.addEventListener('keyup', function keyPressed(e) {
        if(e.key == 'e' || e.key == 'E') {
            
            if(itemType == 'dish' && statsPlayer.inventory.dishes.length <= 0) {
                statsPlayer.inventory.dishes.push(item)
                showAlert('item-picked', "PLATO RECOGIDO!")
                printInventory()
            }
            // else {
            //     showAlert('item-picked', "YA TIENES UN PLATO EN EL INVENTARIO!")
            // }
            if(itemType == 'ingredient') {
                if(statsPlayer.inventory.dishes.length > 0) {
                    if(statsPlayer.inventory.dishes[0].ingredients.length <= 0) {
                        statsPlayer.inventory.dishes[0].ingredients.push(item)
                        showAlert('item-picked', (item.name).toUpperCase() + " RECOGIDO!")
                        printInventory()
                    }
                    else {
                        let itemAlreadyExists = statsPlayer.inventory.dishes[0].ingredients.includes(item);

                        if (!itemAlreadyExists) {
                            statsPlayer.inventory.dishes[0].ingredients.push(item)
                            showAlert('item-picked', "INGREDIENTE RECOGIDO");
                            printInventory();
                        } 
                        // else {
                        //     showAlert('item-picked', "YA TIENES ESTE INGREDIENTE EN EL PLATO");
                        // }
                    }
                }
                else {
                    showAlert('item-picked', "DEBES TENER UN PLATO PARA RECOGER UN INGREDIENTE")
                }
            }

        }
    }, { once : true })
}

function dropItem(itemType, item) {
    document.addEventListener('keydown', function(e) {
        if(e.key == 'q' || e.key == 'Q') {
            if(itemType == 'dish') {
                if(statsPlayer.inventory.dishes.length > 0) {
                    statsPlayer.inventory.dishes = [];
                    showAlert('item-picked', "PLATILLO SOLTADO")
                    printInventory()
                    console.log(statsPlayer)
                }
            }
        }
    }, { once : true })
}

function showAlert(alertType, message) {

    let gameplayAlert, duration

    switch (alertType) {
        case 'press-button':
            gameplayAlert = document.getElementById('press-button-alert')
            duration = 1000
            break
        case 'item-picked':
            gameplayAlert = document.getElementById('item-picked-alert')
            duration = 4000
            break

    }
    gameplayAlert.style.display = 'block'
    gameplayAlert.innerText = message

    setTimeout(() => {
        gameplayAlert.style.display = 'none';
        gameplayAlert.innerText = '';
    }, duration);

}

printInventory()
function printInventory() {
    const dishesList = document.getElementById('dishes-list')
    const ingredientsList = document.getElementById('ingredients-list')
    const itemsList = document.getElementById('items-list')
    
    ingredientsList.innerHTML = ''; 
    dishesList.innerHTML = ''; 

    if(statsPlayer.inventory.dishes.length > 0) {
        statsPlayer.inventory.dishes.forEach((dish) => {
            dishesList.insertAdjacentHTML('beforeend', `<li>${dish.name}</li>`);
        })
    }
    else {
        dishesList.innerHTML = ''; 
    }
    if(statsPlayer.inventory.dishes.length > 0) {
        statsPlayer.inventory.dishes[0].ingredients.forEach((ingredient) => {
            ingredientsList.insertAdjacentHTML('beforeend', `<li>${ingredient.name}</li>`);
        })
    }
    else {
        ingredientsList.innerHTML = ''; 
    }
}

printStats()
function printStats() {
    const nombreJugador = document.getElementById('nombre-jugador')
    nombreJugador.innerText = statsPlayer.name
    const puntosJugador = document.getElementById('puntos-jugador')
    puntosJugador.innerText = statsPlayer.pts
}

function animate() {
    
    requestAnimationFrame(animate);

    if(charactercontrols) {

        charactercontrols.update(clock.getDelta());

        if(charactercontrols.model.name == currentPlayer) {

            const modelBB = new THREE.Box3().setFromObject(charactercontrols.model);

            checkCollisions(modelBB);

            writeUserData(statsPlayer.uid,charactercontrols.getPosX(),charactercontrols.getPosZ());

        }

    }
    controls.update();

    renderer.render( scene, camera );

}

if(localStorage.getItem("currentPlayer")) {
    animate();
}

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}
