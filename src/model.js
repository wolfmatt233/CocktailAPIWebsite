import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
} from "firebase/auth";
import {
  getDoc,
  collection,
  addDoc,
  getDocs,
  doc,
  where,
  query,
  updateDoc,
} from "firebase/firestore";
import { auth } from "./credentials";
import { db } from "./credentials";
import Swal from "sweetalert2";

var globalUser = null; //application wide variable to check user status

//----API CONSTANTS----\\

const baseURL = "https://www.thecocktaildb.com/api/json/v1/1/";
const searchURL = "search.php?";
const lookupURL = "lookup.php?";
const byName = "s=";
const byId = "i=";
const byFirstLetter = "f=";

//----USER STATE CHANGE----\\

onAuthStateChanged(auth, (user) => {
  if (user) {
    //----SIGNED IN----\\
    globalUser = user;

    //Show logout and username
    $("#logout").css("display", "block");
    $("#userWrapper p").html(globalUser.displayName);
    $("#userWrapper").attr("href", "#user"); //enable user page routing

    //listen for logout click
    $("#logout").on("click", () => {
      logoutUser(auth);
    });

    viewUser();
    console.log("Signed in.");
  } else {
    //----SIGNED OUT----\\
    globalUser = null;

    //display "sign in" and no log out button
    $("#logout").css("display", "none");
    $("#userWrapper p").html("Sign In");
    $("#userWrapper").attr("href", null);

    userModal();
    console.log("Signed out.");
  }
});

//------USER FEEDBACK------\\

const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 5000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

const ToastMessage = (icon, title, message) =>
  Toast.fire({
    icon: icon,
    title: title,
    text: message,
  });

//---------PAGE ROUTING---------\\

function pagination(letter) {
  $.get(`pages/list.html`, (data) => {
    $("#app").html(data);
    if (letter == "home") {
      index("a");
    } else {
      index(letter);
    }
  });
}

export function changeRoute() {
  let pageID = window.location.hash.replace("#", "");
  let pageLetterID = pageID.split("_").pop(); //letter for pagination
  let itemID = pageID.split("_").pop(); //item id for single view
  pageID = pageID.split("_").shift(); //page id for index view

  switch (pageID) {
    case "":
      pagination("a");
      break;
    case "home":
      pagination(pageLetterID);
      break;
    case "view":
      $.get(`pages/view.html`, (data) => {
        $("#app").html(data);
        view(itemID);
      });
      break;
    case "search":
      $.get(`pages/search.html`, (data) => {
        $("#app").html(data);
        search();
      });
      break;
    case "user":
      $.get(`pages/user.html`, (data) => {
        $("#app").html(data);
        viewUser();
      });
      break;
    case "lists":
      //custom lists from user
      break;
    case "favorites":
      //personal favorites
      break;
    case "reviews":
      //reviews on a certain item
      break;
  }
}

//----------USER CRUD----------\\

function userModal() {
  //send to sign in or create forms via buttons
  $("#userWrapper").on("click", () => {
    if (!globalUser) {
      Swal.fire({
        title: "Do have an account?",
        icon: "question",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        cancelButtonText: "Cancel",
        denyButtonText: "Create Account",
        denyButtonColor: "#3085d6",
        confirmButtonText: "Sign In",
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: "Log In With Existing Account",
            html: `
                <input type="email" id="email" class="swal2-input" placeholder="Email">
                <input type="password" id="password" class="swal2-input" placeholder="Password">
              `,
            focusConfirm: false,
            icon: "info",
            confirmButtonText: "Log In",
            showCancelButton: true,
            cancelButtonText: "Cancel",
            cancelButtonColor: "#d33",
            confirmButtonColor: "#3085d6",
            preConfirm: () => {
              let emailInput = $("#email").val();
              let passwordInput = $("#password").val();
              loginUser(emailInput, passwordInput);
            },
          });
        } else if (result.isDenied) {
          Swal.fire({
            title: "Create Account",
            html: `
                <input type="text" id="username" class="swal2-input" placeholder="Username">
                <input type="email" id="email" class="swal2-input" placeholder="Email">
                <input type="password" id="password" class="swal2-input" placeholder="Password">
              `,
            focusConfirm: false,
            icon: "info",
            confirmButtonText: "Create",
            showCancelButton: true,
            cancelButtonText: "Cancel",
            cancelButtonColor: "#d33",
            preConfirm: () => {
              let usernameInput = $("#username").val();
              let emailInput = $("#email").val();
              let passwordInput = $("#password").val();
              createUser(usernameInput, emailInput, passwordInput);
            },
          });
        }
      });
    }
  });
}

function createUser(uName, email, pw) {
  createUserWithEmailAndPassword(auth, email, pw)
    .then((userCredentials) => {
      //created profile: username, email, pw
      updateProfile(auth.currentUser, {
        displayName: uName,
      });

      //create document in firestore
      let newUser = {
        email: email,
        favorites: [],
        reviews: [],
        lists: [],
        userId: userCredentials.user.uid,
        username: uName,
      };

      addUser(newUser);
    })
    .catch((error) => {
      ToastMessage("error", "Error creating an account!", error.message);
    });
}

async function addUser(newUser) {
  try {
    await addDoc(collection(db, "CocktailDBUsers"), newUser).then(() => {
      ToastMessage("success", "Success", "Account created successfully!");
    });
  } catch (e) {
    ToastMessage("error", "Error creating an account!", error.message);
  }
}

function loginUser(email, password) {
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredentials) => {
      globalUser = auth.currentUser;
      ToastMessage("success", "Success", "Signed in successfully!");
    })
    .catch((error) => {
      ToastMessage("error", "Error signing in!", error.message);
    });
}

function logoutUser(auth) {
  signOut(auth)
    .then(() => {
      globalUser = null;
      ToastMessage("success", "Success", "Signed out successfully!");
      pagination("a");
    })
    .catch((error) => {
      ToastMessage("error", "Error signing out!", error.message);
    });
}

async function viewUser() {
  // if (globalUser) {
    //get all documents from the database aka collection
    const querySnapshot = await getDocs(collection(db, "CocktailDBUsers"));

    querySnapshot.forEach((doc) => {
      doc = doc.data();

      //get doc relating to the current user
      if (doc.userId == globalUser.uid) {
        $("#editUName").attr("placeholder", doc.username);
        $("#editEmail").attr("placeholder", doc.email);

        //get favorites array
        doc.favorites.forEach((id) => {
          let byIdUrl = `${baseURL}${lookupURL}${byId}${id}`;

          $.getJSON(byIdUrl, (data) => {
            data = data.drinks[0];
            $("#userFavorites")
              .append(`
                <a href="#view_${data.idDrink}" class="userDrinkItem">
                  <p>${data.strDrink}</p>
                  <img src="${data.strDrinkThumb}" alt="DrinkImg">
                </a>
              `);
          });
        });
        //show stats from favorites
      }
    });

    function editButtons(type) {

    }

    //allow editing for input boxes on button click, show password box and new button
    $("#editUNameBtn").on("click", () => {
      
    });

    //call update function to save changes
    $("#updateUserInfo").on("click", () => {
      updateUser();
    });

    $("#cancelEdit").on("click", () => {
      
    });
  // } else {
    // $("#userData").html("You need to log in.");
  // }
}

async function updateUser() {
  //username, password, email
  let email = $("#editEmail").val();
  let uName = $("#editUName").val();
  let pw = $("#editPassword").val();

  if (!email || !uName || !pw) {
    return;
  }

  const querySnapshot = await getDocs(collection(db, "CocktailDBUsers"));

  //1. update password
  updatePassword(globalUser, pw).then(() => {
    //2. update document in database
    querySnapshot.forEach((doc) => {
      if (doc.data().userId == globalUser.uid) {
        updateDoc(doc.ref, { email: email, username: uName })
          .then(() => {
            //3. update profile info
            updateProfile(globalUser, {
              displayName: uName,
              email: email,
            });

            $("#editEmail, #editUName, #editPassword").prop("disabled", true);
            $("#editUserInfo").css("display", "block");
            $("#updateUserInfo, #editUserPassword").css("display", "none");
            ToastMessage(
              "success",
              "Success",
              "Information updated successfully!"
            );
          })
          .catch((error) => {
            ToastMessage("error", "Error updating!", error.message);
          });
      }
    });
  });
}

function deleteUser() {
  //remove document from firestore
}

//---------USER ACTIONS---------\\

async function addToFavorites(id) {
  //from details view, add a certain item to a user's favorites
  const querySnapshot = await getDocs(collection(db, "CocktailDBUsers"));

  //for each document
  querySnapshot.forEach((doc) => {
    //find the document relating to the current user
    if (doc.data().userId == globalUser.uid) {
      let newFavorite = doc.data().favorites; //favorites array
      let alreadyAdded = 0;

      //for each favorite
      newFavorite.forEach((item) => {
        //if current id matches favorite item, increase var by 1
        if (item == id) {
          alreadyAdded += 1;
        }
      });

      //if there has been an item added, return, else update the doc
      if (alreadyAdded > 0) {
        checkIfFavorite(id);
      } else {
        newFavorite.push(id);
        updateDoc(doc.ref, { favorites: newFavorite })
          .then(() => {
            ToastMessage("success", "Added", "Added to favorites!");
            checkIfFavorite(id);
          })
          .catch((error) => {
            ToastMessage("error", "Error", error.message);
          });
      }
    }
  });
}

async function checkIfFavorite(id) {
  //from details view, add a certain item to a user's favorites
  const querySnapshot = await getDocs(collection(db, "CocktailDBUsers"));

  //for each document
  querySnapshot.forEach((doc) => {
    //find the document relating to the current user
    if (doc.data().userId == globalUser.uid) {
      let newFavorite = doc.data().favorites; //favorites array
      let alreadyAdded = 0;

      //for each favorite
      newFavorite.forEach((item) => {
        //if current id matches favorite item, increase var by 1
        if (item == id) {
          alreadyAdded += 1;
        }
      });

      //if there has been an item added, return, else update the doc
      if (alreadyAdded > 0) {
        $("#viewData").append("");
        $("#addToFavorites").attr("id", "removeFromFavorites");
        $("#removeFromFavorites").html(
          `<span class="favorite">Favorited</span><span class="remove">Remove</span>`
        );
        $("#removeFromFavorites").on("mouseenter", () => {
          $("#removeFromFavorites").css("background-color", "red");
          $(".favorite").css("display", "none");
          $(".remove").css("display", "block");
        });
        $("#removeFromFavorites").on("mouseleave", () => {
          $("#removeFromFavorites").css("background-color", "#fff");
          $(".favorite").css("display", "block");
          $(".remove").css("display", "none");
        });
      } else {
        return;
      }
    }
  });
}

function removeFromFavorites(id) {
  console.log("Remove", id);
  //from details view, add a certain item to a user's favorites
  // const querySnapshot = await getDocs(collection(db, "CocktailDBUsers"));

  // //for each document
  // querySnapshot.forEach((doc) => {
  //   //find the user document
  //   if (doc.data().userId == globalUser.uid) {
  //     //remove it from the favorites array
  //     let newFavoriteArr = doc.data().favorites;
  //     let alreadyAdded = "";

  //     //for each favorite
  //     newFavoriteArr.forEach((item) => {
  //       //if current id matches favorite item, increase set var
  //       if (item == id) {
  //         alreadyAdded = item;
  //         console.log("item")
  //       }
  //     });
  //   }
  // });
}

function addReview() {
  //from details view, add a review by the user on a certain item
  //review added to separate storage. array of reviews, api item id included
}

//----------API----------\\

function index(letter) {
  let byLetterURL = `${baseURL}${searchURL}${byFirstLetter}${letter}`;
  let alphabet = [..."abcdefghijklmnopqrstuvwxyz"];

  $.getJSON(byLetterURL, (data) => {
    data = data.drinks;

    data.forEach((drink) => {
      $("#listData").append(`
        <a href="#view_${drink.idDrink}" class="drinkItem">
            <p>${drink.strDrink}</p>
            <img src="${drink.strDrinkThumb}" alt="DrinkImg">
        </a>
      `);
    });
  });

  $("#list").append(`<div class="letterPagination"></div>`);

  alphabet.forEach((letter) => {
    $(".letterPagination").append(`<a href="#home_${letter}">${letter}</a>`);
  });
}

async function view(id) {
  let byIdUrl = `${baseURL}${lookupURL}${byId}${id}`;

  $.getJSON(byIdUrl, (data) => {
    data = data.drinks[0];
    let instructions = data.strInstructions.split(".");

    $("#viewItem").prepend(`<img src="${data.strDrinkThumb}" alt="DrinkImg">`);
    $("#name").append(`${data.strDrink}`);
    $("#extraInfo").append(`<li>${data.strAlcoholic}</li>`);
    $("#extraInfo").append(`<li>${data.strCategory}</li>`);
    $("#extraInfo").append(`<li>Use with a ${data.strGlass}</li>`);

    if (globalUser) {
      $("#viewData").append(
        `<button id="addToFavorites">Add to Favorites</button>`
      );
      checkIfFavorite(id);
    }

    //listen for button to add a favorite
    $("#addToFavorites").on("click", () => {
      addToFavorites(id);
    });

    //listen for button to remove a favorite
    $("#removeFromFavorites").on("click", () => {
      removeFromFavorites(id);
    });

    instructions.forEach((sentence) => {
      if (sentence == "") {
        return;
      }
      $("#instructions").append(`<li>${sentence}.</li>`);
    });

    for (const prop in data) {
      let nums = [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
      ];

      nums.forEach((num) => {
        let ingredient = "strIngredient" + num;
        let measure = "strMeasure" + num;

        if (prop == ingredient && data[prop] !== null) {
          $("#ingredients").append(`<li id="${num}">${data[prop]}</li>`);
        }

        if (prop == measure && data[prop] !== null) {
          $(`#ingredients li#${num}`).prepend(`${data[prop]}`);
        }
      });
    }
  });
  //get specific item from api, display details
  //include review, add to favorites, and add to custom list buttons if user is logged in
  //include reviews section: avg star rating and worded reviews
}

export function search() {
  let term = $("#searchBtn").val();
  let byNameUrl = `${baseURL}${searchURL}${byName}${term}`;
  $("h1").append(`${term}"`);

  $.getJSON(byNameUrl, (data) => {
    data = data.drinks;

    if (data === null) {
      $("#listData").html(`No results.`);
    } else {
      data.forEach((drink) => {
        $("#listData").append(`
          <a href="#view_${drink.idDrink}" class="drinkItem">
              <p>${drink.strDrink}</p>
              <img src="${drink.strDrinkThumb}" alt="DrinkImg">
          </a>
        `);
      });
    }
  });
}
