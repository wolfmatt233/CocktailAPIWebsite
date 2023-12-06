import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  deleteUser,
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
  deleteDoc,
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

    //if page is reloaded, make sure view has its buttons, aka feed it the id
    // view(window.location.hash.split("_").pop());

    //listen for logout click
    $("#logout").on("click", () => {
      logoutUser();
    });

    // viewUser();
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
      if (isNaN(itemID) == true) {
        return (window.location.hash = "#home");
      }

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
      if (!globalUser) {
        return (window.location.hash = "#home");
      }

      $.get(`pages/user.html`, (data) => {
        $("#app").html(data);
        viewUser();
      });
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

async function createUser(uName, email, pw) {
  const querySnapshot = await getDocs(collection(db, "CocktailDBUsers"));

  querySnapshot.forEach((doc) => {
    if (doc.data().email == email) {
      return ToastMessage("error", "Sign Up Error", "Email already in use.");
    }
  });

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
      $("#userWrapper p").html(newUser.username);
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

function logoutUser() {
  signOut(auth)
    .then(() => {
      globalUser = null;
      ToastMessage("success", "Success", "Signed out successfully!");
      window.location.hash = "#home";
    })
    .catch((error) => {
      ToastMessage("error", "Error signing out!", error.message);
    });
}

async function viewUser() {
  //get all documents from the database aka collection
  const querySnapshot = await getDocs(collection(db, "CocktailDBUsers"));
  let favoritesArr = [];

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
          getDataFromAsync(data);
          $("#userFavorites").append(`
                <a href="#view_${data.idDrink}" class="userDrinkItem">
                  <p>${data.strDrink}</p>
                  <img src="${data.strDrinkThumb}" alt="DrinkImg">
                </a>
              `);
        });
      });

      function getDataFromAsync(data) {
        favoritesArr.push(data);
        if (favoritesArr.length == doc.favorites.length) {
          getGraphs(favoritesArr);
        }
      }

      function getGraphs(favoritesArr) {
        //alcoholic vs. non
        let alcoholic = [];
        let alcNum = 0;
        let nonAlcNum = 0;

        //categories
        let categories = []; //all categories, including duplicates
        let uniqueCategories = []; //unique categories
        let categoryData = []; //true numbers, match unique indexes
        let catColors = []; //colors for the chart

        //ingredients
        let ingredients = []; //base ingredients
        let cleanIngredients = []; //lowercase all ingredients to prevent case sensetive duplication
        let uniqueIngredients = []; //remove duplicates
        let ingredientData = []; //actual numbers for amount for each ingredient
        let ingredientColors = []; //colors for chart

        //get data for each statistic
        favoritesArr.forEach((item) => {
          categories.push(item.strCategory); //pie chart for categories
          alcoholic.push(item.strAlcoholic); //pie chart for alcohilic or non

          for (const prop in item) {
            let nums = [];
            for (var i = 1; i <= 15; i++) {
              nums.push(i);
            }

            nums.forEach((num) => {
              let ingredient = "strIngredient" + num;

              if (prop == ingredient && item[prop] !== null) {
                ingredients.push(item[prop]);
              }
            });
          }
        });

        //# of alcoholic vs # of non alcoholic drinks
        alcoholic.forEach((item) => {
          item = item.toLowerCase();
          if (item == "alcoholic") {
            alcNum += 1;
          } else if (item == "non alcoholic") {
            nonAlcNum += 1;
          }
        });

        $("#alcoholicOrNo").html(`
          # of Alcoholic Drinks: <b>${alcNum}</b> vs. # of Non-Alcoholic Drinks: <b>${nonAlcNum}</b>
        `);

        //CATEGORIES PIE CHART

        //get unique categories array
        uniqueCategories = categories.filter(
          (item, i, ar) => ar.indexOf(item) === i
        );

        //for however long the categories array is, set its index value to 0 to start
        for (let i = 0; i < uniqueCategories.length; i++) {
          categoryData[i] = 0;
        }

        //for each category, if it matches a unique one, increase that index value by one
        categories.forEach((item) => {
          for (let i = 0; i < uniqueCategories.length; i++) {
            if (item == uniqueCategories[i]) {
              categoryData[i] += 1;
            }
          }
        });

        //get random colors for the amount of items
        uniqueCategories.forEach((item) => {
          catColors.push(
            "#" +
              ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, "0")
          );
        });

        new Chart("categoryChart", {
          type: "doughnut",
          data: {
            labels: uniqueCategories,
            datasets: [
              {
                backgroundColor: catColors,
                data: categoryData,
              },
            ],
          },
          options: {
            title: {
              display: true,
              text: "Categories",
            },
          },
        });

        //INGREDIENTS BAR CHART

        ingredients.forEach((item) => {
          cleanIngredients.push(item.toLowerCase());
        });

        //remove duplicates
        uniqueIngredients = cleanIngredients.filter(
          (item, i, ar) => ar.indexOf(item) === i
        );

        //for each ingredient, set index to 0
        for (let i = 0; i < uniqueIngredients.length; i++) {
          ingredientData[i] = 0;
        }

        //add 1 to each counter if the items match between unique and clean
        cleanIngredients.forEach((item) => {
          for (let i = 0; i < uniqueIngredients.length; i++) {
            if (item == uniqueIngredients[i]) {
              ingredientData[i] += 1;
            }
          }
        });

        //get a random color for however many unique ingredients there are
        uniqueIngredients.forEach((item) => {
          ingredientColors.push(
            "#" +
              ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, "0")
          );
        });

        new Chart("ingredientChart", {
          type: "bar",
          data: {
            labels: uniqueIngredients,
            datasets: [
              {
                backgroundColor: ingredientColors,
                data: ingredientData,
              },
            ],
          },
          options: {
            title: {
              display: true,
              text: "Your Favorite Ingredients",
            },
            legend: {
              display: false,
            },
            scales: {
              yAxes: [
                {
                  ticks: {
                    beginAtZero: true,
                  },
                },
              ],
            },
          },
        });
      }
    }
  });

  const editButtons = (type) => {
    $(`#edit${type}Btn`).css("display", "none");
    $(`#update${type}Btn, #cancel${type}EditBtn`).css("display", "block");
    $(`#edit${type}`).prop("disabled", false);

    //close buttons on cancel
    $(`#cancel${type}EditBtn`).on("click", () => {
      $(`#edit${type}Btn`).css("display", "block");
      $(`#update${type}Btn, #cancel${type}EditBtn`).css("display", "none");
      $(`#edit${type}`).prop("disabled", true);
      $(`#edit${type}`).prop("value", "");
    });

    $(`#update${type}Btn`).on("click", () => {
      let value = $(`#edit${type}`).val();
      updateUser(type, value);

      $(`#edit${type}Btn`).css("display", "block");
      $(`#update${type}Btn, #cancel${type}EditBtn`).css("display", "none");
      $(`#edit${type}`).prop("disabled", true);
      $(`#edit${type}`).prop("value", "");
    });
  };

  //allow editing for input boxes on button click, show password box and new button
  $("#editUNameBtn, #editEmailBtn, #editPwBtn").on("click", (e) => {
    let btnType = e.target.id.replace("edit", "");
    btnType = btnType.replace("Btn", "");
    editButtons(btnType);
  });

  $("#deleteAccount").on("click", () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You are deleting your account!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteCurrentUser();
      }
    });
  });
}

async function updateUser(type, value) {
  const querySnapshot = await getDocs(collection(db, "CocktailDBUsers"));
  let userDoc;

  querySnapshot.forEach((doc) => {
    if (doc.data().userId == globalUser.uid) {
      userDoc = doc;
    }
  });

  if (value == "") {
    return ToastMessage("error", "Error", "You must fill out the form!");
  } else {
    if (type === "Email") {
      //1. update doc in db
      updateDoc(userDoc.ref, { email: value })
        .then(() => {
          //2. update separate user  profile
          updateProfile(globalUser, {
            email: value,
          });
          ToastMessage("success", "Success", "Email updated successfully!");
        })
        .catch((error) => {
          ToastMessage("error", "Error updating email!", error.message);
        });
    } else if (type === "UName") {
      //1. update doc in db
      updateDoc(userDoc.ref, { username: value })
        .then(() => {
          //2. update separate user profile
          updateProfile(globalUser, {
            displayName: value,
          });
          $("#userWrapper p").html(value);
          ToastMessage("success", "Success", "Username updated successfully!");
        })
        .catch((error) => {
          ToastMessage("error", "Error updating username!", error.message);
        });
    } else if (type === "Pw") {
      //update password for user
      updatePassword(globalUser, value)
        .then(() => {
          ToastMessage("success", "Success", "Password updated successfully!");
        })
        .catch((error) => {
          ToastMessage("error", "Error updating password!", error.message);
        });
    }
  }
}

async function deleteCurrentUser() {
  //remove document from firestore
  const querySnapshot = await getDocs(collection(db, "CocktailDBUsers"));

  querySnapshot.forEach((doc) => {
    //get doc relating to the current user
    if (doc.data().userId == globalUser.uid) {
      deleteUser(auth.currentUser) //delete user
        .then(() => {
          deleteDoc(doc.ref) //delete document
            .then(() => {
              logoutUser(); //log out
              ToastMessage(
                "success",
                "Success",
                "Deleted account successfully!"
              );
              globalUser = null;
              window.location.hash = "#home";
            })
            .catch((error) => {
              ToastMessage("error", "Error deleting account!", error.message);
            });
        })
        .catch((error) => {
          ToastMessage("error", "Error deleting account!", error.message);
        });
    }
  });
}

//----------FAVORITES & REVIEWS----------\\

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
        checkItemButtons(id);
      } else {
        newFavorite.push(id);
        updateDoc(doc.ref, { favorites: newFavorite })
          .then(() => {
            ToastMessage("success", "Added", "Added to favorites!");
            checkItemButtons(id);
          })
          .catch((error) => {
            ToastMessage("error", "Error", error.message);
          });
      }
    }
  });
}

async function removeFromFavorites(id) {
  //from details view, add a certain item to a user's favorites
  const querySnapshot = await getDocs(collection(db, "CocktailDBUsers"));

  querySnapshot.forEach((doc) => {
    if (doc.data().userId == globalUser.uid) {
      let newFavoriteArr = doc.data().favorites;
      let alreadyAdded = "";

      //for each favorite
      newFavoriteArr.forEach((item, idx) => {
        //if current id matches favorite item, increase set var
        if (item == id) {
          newFavoriteArr.splice(idx, 1);
          alreadyAdded = item;

          updateDoc(doc.ref, { favorites: newFavoriteArr })
            .then(() => {
              ToastMessage("success", "Added", "Removed From favorites!");
              checkItemButtons(id);
            })
            .catch((error) => {
              ToastMessage("error", "Error", error.message);
            });
        }
      });
    }
  });
}

function reviewModal(id) {
  //modal for text and score
  Swal.fire({
    title: "Add A Review",
    html: `
        <select name="starRating" id="starRating" class="swal2-select">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
        <input type="textarea" id="reviewText" class="swal2-textarea" placeholder="Add review...">
      `,
    focusConfirm: false,
    icon: "info",
    confirmButtonText: "Add Review",
    showCancelButton: true,
    cancelButtonText: "Cancel",
    cancelButtonColor: "#d33",
    confirmButtonColor: "#3085d6",
    preConfirm: () => {
      let ratingInput = $("#starRating").val();
      let reviewInput = $("#reviewText").val();
      addEditReview(ratingInput, reviewInput, id);
    },
  });
}

async function addEditReview(rating, review, id) {
  //from details view, add a review by the user on a certain item
  const querySnapshot = await getDocs(collection(db, "CocktailDBUsers"));
  let currentItem = "";

  querySnapshot.forEach((doc) => {
    //find the document relating to the current user
    if (doc.data().userId == globalUser.uid) {
      //create new review
      let newReview = {
        itemId: id,
        review: review,
        starScore: Number(rating),
        userId: globalUser.uid,
      };

      let reviewsArr = doc.data().reviews; //get current reviews array

      reviewsArr.forEach((review, idx) => {
        //if the current review is being edited
        if (review.itemId == id) {
          currentItem = review.itemId;
          reviewsArr[idx] = newReview;

          updateDoc(doc.ref, { reviews: reviewsArr })
            .then(() => {
              ToastMessage("success", "Added", "Review Edited!");
              checkItemButtons(id);
            })
            .catch((error) => {
              ToastMessage("error", "Error", error.message);
            });
        }
      });

      if (currentItem !== id) {
        reviewsArr.push(newReview);

        updateDoc(doc.ref, { reviews: reviewsArr })
          .then(() => {
            ToastMessage("success", "Added", "Review Added!");
            checkItemButtons(id);
          })
          .catch((error) => {
            ToastMessage("error", "Error", error.message);
          });
      }
    }
  });
}

async function deleteReview(id) {
  const querySnapshot = await getDocs(collection(db, "CocktailDBUsers"));

  querySnapshot.forEach((doc) => {
    //find the document relating to the current user
    if (doc.data().userId == globalUser.uid) {
      let reviewsArr = doc.data().reviews; //get current reviews array

      reviewsArr.forEach((review, idx) => {
        //if the current review is being deleted
        if (review.itemId == id) {
          reviewsArr.splice(idx, 1);
          updateDoc(doc.ref, { reviews: reviewsArr })
            .then(() => {
              ToastMessage("success", "Deleted", "Review Deleted!");
              checkItemButtons(id);
            })
            .catch((error) => {
              ToastMessage("error", "Error", error.message);
            });
        }
      });
    }
  });
}

async function showReviews(id) {
  $("#showReviews").remove();
  $("#toggleReviews").css("display", "block");
  const querySnapshot = await getDocs(collection(db, "CocktailDBUsers"));

  querySnapshot.forEach((doc) => {
    doc.data().reviews.forEach((review) => {
      if (review.itemId == id) {
        $("#viewReviews").append(`
          <div class="reviewItem">
            <h3>${doc.data().username}</h3>
            <p>Rating: ${review.starScore} stars</p>
            <p>${review.review}</p>
          </div>
        `);
      }
    });
  });
}

//checks detailed view page on whether to display certain buttons
async function checkItemButtons(id) {
  //from details view, add a certain item to a user's favorites
  const querySnapshot = await getDocs(collection(db, "CocktailDBUsers"));
  let numOfRatings = 0;
  let avgRating = 0;

  //for each document
  querySnapshot.forEach((doc) => {
    //get average rating
    doc.data().reviews.forEach((review) => {
      if (review.itemId == id) {
        numOfRatings++;
        avgRating += Number(review.starScore);
      }
    });

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

      //if there has been an item added display proper button, else display the other button
      if (alreadyAdded > 0) {
        //show remove button
        $("#addToFavorites").attr("id", "removeFromFavorites");
        $("#removeFromFavorites").html(
          `<span class="favorite">Favorited</span><span class="remove">Remove</span>`
        );

        //hover visuals for remove button
        $("#removeFromFavorites").on("mouseenter", () => {
          $("#removeFromFavorites").css("background-color", "red");
          $(".favorite").css("display", "none");
          $(".remove").css("display", "block");
        });

        //hover visuals for remove button
        $("#removeFromFavorites").on("mouseleave", () => {
          $("#removeFromFavorites").css("background-color", "#fff");
          $(".favorite").css("display", "block");
          $(".remove").css("display", "none");
        });

        //listen for button to remove a favorite
        $("#removeFromFavorites").on("click", () => {
          removeFromFavorites(id);
        });
      } else {
        //show add to favorites button
        $("#removeFromFavorites")
          .attr("id", "addToFavorites")
          .html("Add to Favorites")
          .css("background-color", "");

        //listen for button to remove a favorite
        $("#removeFromFavorites").on("click", () => {
          addToFavorites(id);
        });
      }

      let noReviewNum = "";

      //if there is already a review, show correct button
      doc.data().reviews.forEach((review) => {
        if (review.itemId === id) {
          //if there is already a review, show edit and delete
          $("#addReview").attr("id", "editReview");
          $("#editReview").html("Edit Review");

          //if delete button is already there, do nothing
          if ($("#deleteReview").val() == null) {
            $("#buttonRow").append(
              `<button id="deleteReview">Delete Review</button>`
            );

            //hover visuals for delete button
            $("#deleteReview").on("mouseenter", () => {
              $("#deleteReview").css("background-color", "red");
            });

            //hover visuals for delete button
            $("#deleteReview").on("mouseleave", () => {
              $("#deleteReview").css("background-color", "#fff");
            });

            //call function on click of button
            $("#deleteReview").on("click", () => {
              deleteReview(id);
            });
          }
        } else {
          //else increase counter
          noReviewNum++;
        }
      });

      //if there is no review, show only add review
      if (doc.data().reviews.length == noReviewNum) {
        $("#editReview").attr("id", "addReview");
        $("#addReview").html("Add Review");
        $("#deleteReview").remove();
      }
    }
  });

  avgRating = avgRating / numOfRatings;

  $("#avgRating").html(
    `Average rating of <b>${avgRating}</b> stars based on <b>${numOfRatings}</b> review(s).`
  );
}

//----------API----------\\

function index(letter) {
  let byLetterURL = `${baseURL}${searchURL}${byFirstLetter}${letter}`;
  let alphabet = [..."abcdefghijklmnopqrstuvwxyz"];

  $.getJSON(byLetterURL, (data) => {
    data = data.drinks;

    if (data == null) {
      $("#listData").append(`No results`);
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

  $("#list").append(`<div class="letterPagination"></div>`);

  alphabet.forEach((letter) => {
    $(".letterPagination").append(`<a href="#home_${letter}">${letter}</a>`);
  });
}

async function view(id) {
  if (isNaN(id)) {
    return console.log("different page");
  } else {
    let byIdUrl = `${baseURL}${lookupURL}${byId}${id}`;

    //get api information for item
    $.getJSON(byIdUrl, (data) => {
      data = data.drinks[0];
      let instructions = data.strInstructions.split(".");

      $("#name, #extraInfo, #instructions, #ingredients").html("");

      $("#viewImg").attr("src", `${data.strDrinkThumb}`);
      $("#name").append(`${data.strDrink}`);
      $("#extraInfo").append(`<li>${data.strAlcoholic}</li>`);
      $("#extraInfo").append(`<li>${data.strCategory}</li>`);
      $("#extraInfo").append(`<li>Use with a ${data.strGlass}</li>`);

      //get instructions
      instructions.forEach((sentence) => {
        if (sentence == "") {
          return;
        }
        $("#instructions").append(`<li>${sentence}.</li>`);
      });

      //get ingredients
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

    const querySnapshot = await getDocs(collection(db, "CocktailDBUsers"));
    let numOfRatings = 0;
    let avgRating = 0;

    //get average rating
    querySnapshot.forEach((doc) => {
      doc.data().reviews.forEach((review) => {
        if (review.itemId == id) {
          numOfRatings++;
          avgRating += Number(review.starScore);
        }
      });
    });

    avgRating = avgRating / numOfRatings;

    $("#avgRating").html(
      `Average rating of <b>${avgRating}</b> stars based on <b>${numOfRatings}</b> review(s).`
    );

    //----APPEND USER BUTTONS----\\

    if (globalUser) {
      //prevent duplication of button on reload of page
      if ($("#addToFavorites").val() == null) {
        $("#buttonRow").append(
          `<button id="addToFavorites">Add to Favorites</button>`
        );
      }

      //prevent duplication of button on reload of page
      if ($("#addReview").val() == null) {
        $("#buttonRow").append(`<button id="addReview">Add Review</button>`);
      }

      checkItemButtons(id);
    }

    //----DETAIL PAGE BUTTON LISTENERS----\\

    $("#addToFavorites").on("click", () => {
      addToFavorites(id);
    });

    $("#addReview").on("click", () => {
      reviewModal(id);
    });

    $("#showReviews").on("click", () => {
      showReviews(id);
    });

    $("#toggleReviews").on("click", () => {
      if ($("#toggleReviews").text() == "Hide Reviews") {
        //hide reviews
        $(".reviewItem").css("display", "none");
        $("#toggleReviews").html("Show Reviews");
      } else if ($("#toggleReviews").text() == "Show Reviews") {
        //show reviews again
        $(".reviewItem").css("display", "block");
        $("#toggleReviews").html("Hide Reviews");
      }
    });
  }
}

export function search() {
  let term = $("#searchBtn").val();

  if (term === "") {
    $("#listData").html(`No results.`);
    $("h1").append(`"`);
    return;
  }

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
