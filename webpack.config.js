const path = require("path")

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist/app"),
    filename: "app.js",
  },

  //   this will set a watcher on the index.js file for any changes
  watch: true,
}