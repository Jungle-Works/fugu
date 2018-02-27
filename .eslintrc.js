module.exports = {
  // follow these steps enable
  // npm install eslint
  // npm i eslint-plugin-import@latest --save-dev -g
  // npm install eslint-config-airbnb-base -g
  // eslint <filename> --fix
  "extends": "airbnb-base",
  "rules": {
    "linebreak-style": [
      "error",
      "unix"
    ],
    "semi": [
      "error",
      "always"
    ],
    "no-irregular-whitespace": [
      "error",
      {
        "skipComments": true
      }
    ],
    "getter-return": [
      "error",
      {
        "allowImplicit": true
      }
    ],
    "no-duplicate-case": [
      "error"
    ],
    "key-spacing" : [
      "error",
      {
        "singleLine": {
          "beforeColon": true,
          "afterColon": true
        },
        "multiLine": {
          "beforeColon": true,
          "afterColon": true
        },
        "align":
          {
            "beforeColon": true,
            "afterColon": true,
            "on": "colon"
          }
      }
    ],
    "keyword-spacing": [
      "error",
      {
        "overrides": {
          "if": {"after": false}
        }
      }
    ]
    ,
    "no-console": 0, //ignore console
    "comma-dangle": 0,
    "func-names": ["error", "never"],
    "no-underscore-dangle": 0,
    "max-len": ["error", { "code": 300, "tabWidth": 4, "ignoreUrls": true, "ignoreTemplateLiterals": true, "ignoreRegExpLiterals": true }],
    "no-multi-assign": 0,
    "no-multi-spaces": 0,
    "no-extra-parens": 0,
    "quotes":0,
    "prefer-template":0,
    "no-multiple-empty-lines":0,
    "no-extend-native":0,
    "no-restricted-syntax":0,
    "object-shorthand":0,
    "no-unused-expressions":0,
    "prefer-rest-params":0,
    "import/no-dynamic-require": 0,
    "no-undef": 0,                  //this show error on dynamic function which are defined at run time
    "no-param-reassign": 0,         //showing error for abc=abc
    "consistent-return": 0,
    "no-plusplus": 0,               //as we have to use ++ and -- so we are avoiding this
    "no-unused-vars": 0,            //this shows error on variable which are defined at runtime
    "no-mixed-operators": 0,        // its forbade the use of && and || together which may effect the logic
    "no-prototype-builtins": 0,
    "array-callback-return": 0,     //it forbades the use of filter map
    "indent": [2, 2, {"SwitchCase": 1}],//It just give four spaces instead of two.I have customize it for proper indentation
    "newline-per-chained-call": 0,
    "no-var" : 0,                   // no var rule
    "no-self-assign" : 0,
    "no-case-declarations" : 0,
    "require-yield" : 0,
    "prefer-const" : 0,             //convert each var to const that is never reassigned again
    "no-mixed-spaces-and-tabs" : 0, //ignore mixed tabs and spaces
    "no-trailing-spaces" : 0,       //ignore unnecessary spaces
    "no-use-before-define" : 0,     //ignore function used before declared
    "camelcase" : 0,                //ignore camelcase
    "eqeqeq" : 0,                   // === ignore
    "prefer-destructuring" : 0,     //ignore call function directly from requiring file
    "no-shadow": 0,                 // value assigned to arguments ignore it
    "no-extend-nat" : 0,            //String prototype is read only, properties should not be added
    "no-restricted" : 0,            // for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array
    "no-buffer-constructor" : 0,    //new Buffer() is deprecated. Use Buffer.from(), Buffer.alloc(), or Buffer.allocUnsafe() instead
    "no-nested-ternary" : 0,        //no ternary operator inside ternary
    "no-path-concat": 0,            // ignore Use path.join() or path.resolve() instead of + to create paths
    "global-require" : 0
  },
  "plugins": [
    "import"
  ]
};