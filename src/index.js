import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  getDoc,
  collection,
  addDoc,
  getDocs,
  doc,
  where,
  query,
} from "firebase/firestore";
import { firebaseConfig } from "./credentials";
import * as MODEL from "./model.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
var globalUser = null; //application wide variable to check user status


onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    globalUser = user;
    userModal(); //modal needs to know the user state before being called
    console.log("Signed in.");
  } else {
    // User is signed out
    userModal();
    updateUserDisplay();
    console.log("You need to sign in.");
  }
});



//---------INIT---------\\

function initListeners() {
  routes();
}

$(document).ready(function () {
  initListeners();
});



//---------PAGE ROUTING---------\\

function routes() {
  let hashLocation = window.location.hash;
  let pageID = hashLocation.replace("#", "");

  if (pageID == "home" || pageID == "") {
    MODEL.index("a");
  } else if(pageID == "user") {
    viewUser();
  }
}



//----------USER CRUD----------\\

function userModal() {
  updateUserDisplay();

  //if there is a logged in user
  if (globalUser === null) {
    //Modal is allowed
    $("#userWrapper").on("click", () => {
      $("#modalBackground").css("display", "block")

      $("#createAcctBtn").on("click", () => {
        createUser();
      });

      $("#loginBtn").on("click", () => {
        loginUser();
      });
    });
  } else {
    //listen for logout click
    $("#logout").on("click", () => {
      logoutUser(auth);
    });
  }
}

function createUser() {
  $(".error").html("");
  let uName = $("#uNameCreate").val();
  let email = $("#emailCreate").val();
  let pw = $("#pwCreate").val();

  if (!uName || !email || !pw) {
    return $(".error").html("Form must be complete.").css("color", "red");
  }

  createUserWithEmailAndPassword(auth, email, pw)
    .then((userCredentials) => {
      updateProfile(auth.currentUser, {
        displayName: uName,
      });

      //create document in firestore
      let newUser = {
        email: email,
        favorites: [],
        reviews: [],
        customLists: [],
        userId: userCredentials.user.uid,
        username: uName,
      };

      addUser(newUser);

      console.log("Created ", userCredentials.user);

      clearForms();
      updateUserDisplay();
    })
    .catch((error) => {
      console.log("Error creating user: ", error.message);
    });
}

async function addUser(newUser) {
  try {
    const docRef = await addDoc(collection(db, "CocktailDB"), newUser);
    console.log("Doc id: " + docRef.id);
  } catch (e) {
    console.log("Error adding to db: ", e);
  }
}

function loginUser() {
  let email = $("#email").val();
  let password = $("#pw").val();

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredentials) => {
      clearForms();
      updateUserDisplay();
    })
    .catch((e) => {
      console.log("Error Logging in", e.message);
    });
}

function logoutUser(auth) {
  signOut(auth)
    .then(() => {
      globalUser = null //set current
      updateUserDisplay();
    })
    .catch((e) => {
      console.log("Error signing out: ", e.message);
    });
}

function clearForms() {
  $("#modalBackground").css("display", "none")
  $("#userModal .modalInputs .paramInput").val("");
}

function updateUserDisplay() {
  if(globalUser) {
    //if signed in, display logout button and username
    $("#logout").css("display", "block")
    $("#userWrapper p").html(globalUser.displayName)
  } else {
    //if not signed in, display "sign in" and no log out button
    $("#logout").css("display", "none")
    $("#userWrapper p").html("Sign In")
  }
}

function viewUser() {
  //get user information from storage to make graphs
  if(!globalUser) {
    $("#app").html("You need to log in or sign up first.")
  } 
}

function updateUser() {
  //username, password, email, bio
}

function deleteUser() {
  //remove document from firestore
}



//---------USER ACTIONS---------\\

function addToFavorites() {
  //from details view, add a certain item to a user's favorites
}

function addReview() {
  //from details view, add a review by the user on a certain item
  //review added to separate storage. array of reviews, api item id included
}