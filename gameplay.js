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
let timerCounter = 1800;

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
            writeUserData(currentUser.uid, 5, 0);

            localStorage.setItem('currentPlayer', currentUser.uid)
            localStorage.setItem('currentPlayerName', currentUser.displayName)

            statsPlayer.uid = currentUser.uid
            statsPlayer.name = currentUser.displayName
            statsPlayer.pts = 0
            statsPlayer.inventory = { items : [], dishes : []}

            printStats()
            location.href = location.href;

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
            writeUserData(currentUser.uid, 5, 0);
            
            localStorage.setItem('currentPlayer', currentUser.uid)
            localStorage.setItem('currentPlayerName', currentUser.displayName)

            statsPlayer.uid = currentUser.uid
            statsPlayer.name = currentUser.displayName
            statsPlayer.pts = 0
            statsPlayer.inventory = { items : [], dishes : []}

            printStats()
            location.href = location.href;
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

const cubeGeometry = new THREE.BoxGeometry(70, 3, 2);
const cubeGeometry2 = new THREE.BoxGeometry(2, 3, 70);
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff1000 });
const downCollision = new THREE.Mesh(cubeGeometry, cubeMaterial)
downCollision.position.z=19
const upCollision = new THREE.Mesh(cubeGeometry, cubeMaterial)
upCollision.position.z=-37
const leftCollision = new THREE.Mesh(cubeGeometry2, cubeMaterial)
leftCollision.position.x=-31
const rightCollision = new THREE.Mesh(cubeGeometry2, cubeMaterial)
rightCollision.position.x=31

const ingredients = [
    {
        "name": "Arroz",
        "position": {"x": 7, "z": -30},
        "boundingBox": ""
    },
    {
        "name": "Algas",
        "position": {"x": -8, "z": -30},
        "boundingBox": ""

    },
    {
        "name": "Salmon",
        "position": {"x": 0, "z": -18},
        "boundingBox": ""
    }
]

const dishes = [
    {
        "name": "Plato del jugador",
        "ingredients": [],
    },
    {
        "name": "Plato vacio",
        "ingredients": [],
    },
    {
        "name": "Tazon de arroz",
        "ingredients": [
            ingredients[0]
        ]
    },
    {
        "name": "Onigiri",
        "ingredients": [
            ingredients[0],
            ingredients[1]
        ]
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

const customers = [
    {
        "id": "client_1",
        "order": dishes[2],
        "pts": 80,
        "waitingTime": 30000,
        "position": {
            "x": 3,
            "z": 3
        },
        "mesh": "",
        "boundingBox": "",
        "orderTaken": false,
        "orderDelivered": false,
        "spawned": false
    }
]

const orders = []

let basuraMesh
let basuraBB
new GLTFLoader().load('Models/Environment/glTF/Environment_Pot_2_Empty.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            object.castShadow=true;
        } 
    });
    model.scale.set(2,2,2)
    basuraMesh=model;
basuraMesh.position.x = -17;
basuraMesh.position.z = -30;
 basuraBB = new THREE.Box3().setFromObject(basuraMesh);
scene.add(basuraMesh);})

let platoMesh;
let platoBB
new GLTFLoader().load('Models/Environment/glTF/Environment_Bowl.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            object.castShadow=true;
        } 
    });
    model.scale.set(5,5,5)
    platoMesh=model;
platoMesh.position.x = 16;
platoMesh.position.z = -30;
platoBB = new THREE.Box3().setFromObject(platoMesh);
scene.add(platoMesh);
})

let arrozMesh
new GLTFLoader().load('Models/Food/glTF/FoodIngredient_Rice.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            object.castShadow=true;
        } 
    });
    model.scale.set(5,5,5)
    arrozMesh=model;
arrozMesh.position.x = ingredients[0].position.x;
arrozMesh.position.z = ingredients[0].position.z;
let arrozBB = new THREE.Box3().setFromObject(arrozMesh);
ingredients[0].boundingBox = arrozBB
scene.add(arrozMesh);})

let algasMesh
new GLTFLoader().load('Models/Food/glTF/FoodIngredient_Nori.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            object.castShadow=true;
        } 
    });
    model.position.y=0.3;
    model.scale.set(5,5,5)
    algasMesh=model;
algasMesh.position.x = ingredients[1].position.x;
algasMesh.position.z = ingredients[1].position.z;
let algasBB = new THREE.Box3().setFromObject(algasMesh);
ingredients[1].boundingBox = algasBB;
scene.add(algasMesh);
})


let salmonMesh
new GLTFLoader().load('Models/Food/glTF/FoodIngredient_Salmon.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            object.castShadow=true;
        } 
    });
    model.scale.set(5,5,5)
    salmonMesh=model;
    salmonMesh.position.x = ingredients[2].position.x;
    salmonMesh.position.z = ingredients[2].position.z;
    let salmonBB = new THREE.Box3().setFromObject(salmonMesh);
    ingredients[2].boundingBox = salmonBB
    scene.add(salmonMesh);
})

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
    gltf.scene.position.z = 5;
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
    
 mapColissions.push(new THREE.Box3().setFromObject(downCollision))
 mapColissions.push(new THREE.Box3().setFromObject(upCollision))
 mapColissions.push(new THREE.Box3().setFromObject(leftCollision))
 mapColissions.push(new THREE.Box3().setFromObject(rightCollision))
    scene.add(gltf.scene);
 });

//Sonido
const listener = new THREE.AudioListener();
const backgroundMusic= new THREE.Audio(listener);
const trashSound= new THREE.Audio(listener);
const pickupSound= new THREE.Audio(listener);
const dishSound= new THREE.Audio(listener);
const happySound= new THREE.Audio(listener);
const takeorderSound= new THREE.Audio(listener);
const audioLoader= new THREE.AudioLoader();
audioLoader.load("Audio/Zazie.mp3", function(buffer){
    backgroundMusic.setBuffer(buffer);
    backgroundMusic.setLoop(true);
    backgroundMusic.setVolume(0.5);
    backgroundMusic.play();
})
audioLoader.load("Audio/basura.wav", function(buffer){
    trashSound.setBuffer(buffer);
    trashSound.setLoop(false);
    trashSound.setVolume(1.0);
})
audioLoader.load("Audio/recoger.wav", function(buffer){
    pickupSound.setBuffer(buffer);
    pickupSound.setLoop(false);
    pickupSound.setVolume(1.0);
})
audioLoader.load("Audio/plato.wav", function(buffer){
    dishSound.setBuffer(buffer);
    dishSound.setLoop(false);
    dishSound.setVolume(1.0);
})
audioLoader.load("Audio/clientefeliz.wav", function(buffer){
    happySound.setBuffer(buffer);
    happySound.setLoop(false);
    happySound.setVolume(1.0);
})
audioLoader.load("Audio/tomarorden.wav", function(buffer){
    takeorderSound.setBuffer(buffer);
    takeorderSound.setLoop(false);
    takeorderSound.setVolume(1.0);
})
camera.add(listener)

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

//MODELO DE CLIENTE
var arrCustModels=[];
new GLTFLoader().load('Rabbit_Purple.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            if(object.name=="Knife"||object.name=="Pan")object.visible=false;
            object.castShadow=true;
        } 
    });
    arrCustModels.push(model);
})
new GLTFLoader().load('Rabbit_Grey.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            if(object.name=="Knife"||object.name=="Pan")object.visible=false;
            object.castShadow=true;
        } 
    });
    arrCustModels.push(model);
})
new GLTFLoader().load('Rabbit_Cyan.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            if(object.name=="Knife"||object.name=="Pan")object.visible=false;
            object.castShadow=true;
        } 
    });
    arrCustModels.push(model);
})
new GLTFLoader().load('Rabbit_Blond.gltf', function(gltf){
    const model = gltf.scene;
    model.traverse(object=>{
        if(object.isMesh) {
            if(object.name=="Knife"||object.name=="Pan")object.visible=false;
            object.castShadow=true;
        } 
    });
    arrCustModels.push(model);
})

//SPAWNEAR CLIENTES
function spawnCustomer(customer) {
    const random = Math.floor(Math.random() * arrCustModels.length);
    const clientMesh = arrCustModels[random];
    clientMesh.position.x = customer.position.x;
    clientMesh.position.z = customer.position.z;
    let clientBB = new THREE.Box3().setFromObject(clientMesh);
    scene.add(clientMesh);

    customer.mesh = clientMesh
    customer.boundingBox = clientBB

    customer.spawned = true
}

function deliverCustomerOrder(customer) {
    document.addEventListener('keyup', function keyPressed(e) {
        if(e.key == 'e' || e.key == 'E') {
            if(!customer.orderDelivered) {
                if (!statsPlayer.inventory.dishes[0]) {
                    showAlert('item-picked', "NO TIENES PLATILLOS EN EL INVENTARIO!")
                }
                else if(statsPlayer.inventory.dishes[0].name == customer.order.name) {
                    statsPlayer.pts += customer.pts
                    printStats()
                    printOrders()    
                    if(statsPlayer.inventory.dishes.length > 0) {
                        statsPlayer.inventory.dishes[0].ingredients = []
                        statsPlayer.inventory.dishes.splice(0, 1)
                        showAlert('item-picked', "ORDEN ENTREGADA!")
                        transformDish()
                        printInventory()
                        happySound.play()
                    }
                    customer.orderDelivered = true
                    customer.boundingBox = null
                    despawnCustomer(customer);
                }
                else {
                    showAlert('item-picked', "ORDEN EQUIVOCADA!")
                }
            }
        }
    })
}

//TOMAR ORDEN Y EMPEZAR LA CUENTA REGRESIVA DEL CLIENTE
function takeCostumerOrder(customer) {
    document.addEventListener('keypress', function keyPressed(e) {
        if(e.key == 'e' || e.key == 'E') {
            customer.orderTaken = true
            printOrders()
            takeorderSound.play()
            //INICIA CONTADOR DE ESPERA DEL CLIENTE, PARA DESPUES DESPAWNEAR
            setTimeout(() => {
                despawnCustomer(customer);
            }, customer.waitingTime);
        }
    })
}

//DESPAWNEAR CLIENTES
function despawnCustomer(customer) {
    scene.remove(customer.mesh);
    customer.spawned = false
}

function checkCollisions(modelBB) {
    //COLISION BASURA
    if(modelBB.intersectsBox(basuraBB)){
        showAlert('press-button', "PULSA Q PARA TIRAR EL PLATO")
        dropItem('dish', dishes[0])
    }
    //COLISION PLATITOS
    if(modelBB.intersectsBox(platoBB)){
        showAlert('press-button', "PULSA E PARA RECOGER EL PLATO")
        pickItem('dish', dishes[0])
    }
    //COLISIONES INGREDIENTES
    ingredients.forEach(ingredient => {
        if(modelBB.intersectsBox(ingredient.boundingBox)){
            showAlert('press-button', "PULSA E PARA RECOGER " + (ingredient.name).toUpperCase())
            pickItem('ingredient', ingredient)
        }
    })
    //COLISIONES DE CLIENTES SOLAMENTE SPAWNEADOS
    if(customers.length > 0) {
        customers.filter(customer => customer.spawned === true)
        .forEach(customer => {       
            if(modelBB.intersectsBox(customer.boundingBox)){
                if(customer.orderTaken == false){
                    showAlert('press-button', "PULSA E PARA TOMAR ORDEN")
                    takeCostumerOrder(customer)
                }
                else if(customer.orderDelivered == false) {
                    showAlert('press-button', "PULSA E PARA ENTREGAR ORDEN")
                    deliverCustomerOrder(customer)
                }
            }
        })
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
                transformDish()
                printInventory()
                dishSound.play();
            }
            // else {
            //     showAlert('item-picked', "YA TIENES UN PLATO EN EL INVENTARIO!")
            // }
            if(itemType == 'ingredient') {
                if(statsPlayer.inventory.dishes.length > 0) {
                    if(statsPlayer.inventory.dishes[0].ingredients.length <= 0) {
                        statsPlayer.inventory.dishes[0].ingredients.push(item)
                        showAlert('item-picked', (item.name).toUpperCase() + " RECOGIDO!")
                        transformDish()
                        printInventory()
                        pickupSound.play();
                    }
                    else {
                        let itemAlreadyExists = statsPlayer.inventory.dishes[0].ingredients.includes(item);

                        if (!itemAlreadyExists) {
                            statsPlayer.inventory.dishes[0].ingredients.push(item)
                            showAlert('item-picked', (item.name).toUpperCase() + " RECOGIDO")
                            transformDish()
                            printInventory();
                            pickupSound.play();
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
                    statsPlayer.inventory.dishes[0].ingredients = []
                    statsPlayer.inventory.dishes.splice(0, 1)
                    showAlert('item-picked', "PLATILLO TIRADO A LA BASURA")
                    transformDish()
                    printInventory()
                    trashSound.play();
                    console.log(statsPlayer)
                }
            }
        }
    }, { once : true })
}

function transformDish() {
    if(statsPlayer.inventory.dishes[0]) {
        let currentIngredients = new Set(statsPlayer.inventory.dishes[0].ingredients);
    
        for (let i = 1; i < dishes.length; i++) {
            const dish = dishes[i];
            let dishIngredients = new Set(dish.ingredients);
    
            if (setsEqual(currentIngredients, dishIngredients)) {
                statsPlayer.inventory.dishes[0].name = dish.name;
                break;
            }
        }
    }
}

// Función para comparar dos sets (conjuntos)
function setsEqual(set1, set2) {
    if (set1.size !== set2.size) return false;
    for (let item of set1) {
        if (!set2.has(item)) return false;
    }
    return true;
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

printOrders()
function printOrders() {
    const contenedorOrdenes = document.getElementById('orders')
    contenedorOrdenes.innerHTML = ''
    customers.filter(customer => customer.orderTaken && !customer.orderDelivered)
    .forEach(customer => {  
        contenedorOrdenes.insertAdjacentHTML('beforeend', `<li>${customer.order.name}</li>`)
    })
}

printStats()
function printStats() {
    const nombreJugador = document.getElementById('nombre-jugador')
    nombreJugador.innerText = statsPlayer.name
    const puntosJugador = document.getElementById('puntos-jugador')
    puntosJugador.innerText = statsPlayer.pts
}

function printTimer() {
    const timer = document.getElementById('timer')
    timer.innerText = Math.ceil(timerCounter/60) + ' segundos restantes'
}

//Subir nueva HighScore
function writePuntuacionData(userId, Pts, Nombre) {
    set(ref(db, 'puntuacion/' + userId), {
        Puntos: Pts,
        Name: Nombre
    });
}

function gameOver() {
    const gameOver = document.getElementById('contenedor-game-over')
    const puntuacion = document.getElementById('puntuacion-final')
    gameOver.style.display = 'block'
    puntuacion.innerText = statsPlayer.pts

    //Leer Puntuaciones
const PtsCountRef = ref(db, 'puntuacion');
onValue(PtsCountRef, (snapshot) => {
    const data = snapshot.val();
    let siExiste = 0;
    
    Object.entries(data).forEach(([key, value]) => {
        
    if(statsPlayer.uid == key){
        console.log("Si Existes, puntuacion guardad es: " + `${value.Puntos}`);
        siExiste = 1;
        if(statsPlayer.pts > value.Puntos){
            const HighScore = document.getElementById('HighScore');
            HighScore.innerText = "¡Nueva Puntuacion Mas Alta!";
            writePuntuacionData(statsPlayer.uid, statsPlayer.pts, statsPlayer.name);
            console.log("Ya existias, Nueva Puntuacion Mas Alta: " + statsPlayer.pts);
        }
    }

    });
    if(siExiste == 0){//Primera vez que juega
        const HighScore = document.getElementById('HighScore');
        HighScore.innerText = "¡Nueva Puntuacion Mas Alta!";
        console.log("No tenias puntuacion, ahi te va una nueva");
        writePuntuacionData(statsPlayer.uid, statsPlayer.pts, statsPlayer.name);
    }
});

}
let ArrayPts = [];

function TablaPuntuaciones() {

    const PtsCountRef = ref(db, 'puntuacion');
    onValue(PtsCountRef, (snapshot) => {
        ArrayPts = [];
        const data = snapshot.val();
        
        //console.log("Tabla Puntuaciones");
        Object.entries(data).forEach(([key, value]) => {

        ArrayPts.push(
            { Nombre: `${value.Name}`,
            Score: value.Puntos}
        );
        });

        ArrayPts.sort((a, b) => {
            return b.Score - a.Score;
        });
        console.log(ArrayPts);
    
        const ListaPuntuaciones = document.getElementById('Lista-Puntuaciones')
        ListaPuntuaciones.innerHTML = '';
    
        for (var Player of ArrayPts) {
            ListaPuntuaciones.insertAdjacentHTML('beforeend', `<li>${Player.Nombre}: ${Player.Score}</li>`);
        }
    });
}

function animate() {
    
    requestAnimationFrame(animate);

    if(charactercontrols) {

        charactercontrols.update(clock.getDelta());

        if(charactercontrols.model.name == currentPlayer) {

            const modelBB = new THREE.Box3().setFromObject(charactercontrols.model);

            checkCollisions(modelBB);

            writeUserData(statsPlayer.uid,charactercontrols.getPosX(),charactercontrols.getPosZ());

            timerCounter--;
            printTimer()

            //Eventos del temporizador
            switch (timerCounter) {
                case 0:
                    gameOver();
                    TablaPuntuaciones();
                    break;
                case 1500: 
                    spawnCustomer(customers[0])
                    break;
            }
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
