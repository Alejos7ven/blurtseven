const mysql = require("mysql"); 
const Db    = require('./db.js');

let db          = new Db();
let connection  = mysql.createConnection(db.data);
let DEFAULT_AMOUNT_OF_VOTES = 200;
let custom = [{
    "username":"alejos7ven",
    "bandwidth":1500
}]
connection.connect((err) => {
    if (err) throw err;
    connection.query(`UPDATE users SET votes=${DEFAULT_AMOUNT_OF_VOTES} WHERE status = 1`, function (err, result) {
        if (err) console.log(err);
        else console.log('Votes added!'); 
    })

    if (custom.length > 0) {
            //if (err) throw err;
        custom.forEach((u) => {
            console.log(u.bandwidth, u.username);
            connection.query(`UPDATE users SET votes=${u.bandwidth} WHERE username LIKE '${u.username}'`, function (err, result) {
                if (err) console.log(err);
                else console.log('Votes added!'); 
        
                //
            })
        }) 
    }

    setTimeout(() => {
        connection.end();
    }, 10000);
})
