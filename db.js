require('dotenv').config()
class Db {
    constructor() {
        this.data = {
            host : process.env.HOST,
            database : process.env.DB,
            user : process.env.USER,
            password : process.env.PASSWORD
        }
        this.dbConnection = this.getDataConnection();
    }
    getDataConnection(){
        return this.data;
    }
    getSettings(connection){
        return new Promise((resolve,reject) =>{
            connection.query('SELECT * FROM settings', function(err, results){
                if (err)  reject(err);
                else{
                    let settings = [];
                    results.forEach((r) => { 
                        settings.push({
                            account:r.account,
                            key:r.posting_key,
                            min_weight: r.min_weight,
                            enabled : r.enable_bot
                        });
                    });
                    resolve(settings);
                }
            })
        }).then(r => { return r; })
          .catch(e => {console.log('Fail to get info. ' + e); return false;});
    }
    getSevens(connection){
        return new Promise((resolve,reject) =>{
            connection.query('SELECT username FROM users WHERE status=1', function(err, results){
                if (err)  reject(err);
                else{
                    let list = [];
                    results.forEach((r) => {
                        // if (r.username == 'root') r.username = 'alejos7ven';
                        list.push(r.username);
                    });
                    resolve(list);
                }
            })
        }).then(r => { return r; })
          .catch(e => {console.log('Fail to get info. ' + e); return false;});
    }
    getVotes(connection, curator){
        return new Promise((resolve,reject) =>{
            connection.query(`SELECT votes FROM users WHERE username LIKE '${curator}'`, function(err, results){
                if (err)  reject(err);
                else{
                    let votes = 0;
                    results.forEach((r) => { votes = r.votes; });
                    resolve(votes);
                }
            })
        }).then(r => { return r; })
          .catch(e => {console.log('Fail to get info. ' + e); return false;});
    }

    updateVote(connection, curator, votes){
        return new Promise((resolve,reject) =>{
            connection.query(`UPDATE users SET votes=${votes} WHERE username LIKE '${curator}'`, function(err, results){
                if (err)  reject(err);
                else resolve(true);
            })
        }).then(r => { return r; })
          .catch(e => {console.log('Fail to get info. ' + e); return false;});
    }
}
module.exports = Db;