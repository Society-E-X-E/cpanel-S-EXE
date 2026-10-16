const isTest = process.env.NODE_ENV === "test";

module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" }, modules: isTest ? "commonjs" : false }],
    ["@babel/preset-react", { runtime: "automatic" }],
  ],
  plugins: isTest ? [["@babel/plugin-transform-modules-commonjs", { strict: false }]] : [],
};
