module.exports = {
  plugins: {
    'autoprefixer': {
      overrideBrowserslist: [
        "last 2 versions",
        "> 1%",
        "Safari >= 9",
        "Chrome >= 84",
        "Edge >= 16"
      ]
    }
  }
}