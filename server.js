const app = require("./app");

var mongoUtil = require( './mongoUtil.js' );



  
const PORT = process.env.PORT || 3000;

app.listen(PORT, console.log(`Server running on  ${PORT}`));
