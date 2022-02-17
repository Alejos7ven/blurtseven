const blurt = require("@blurtfoundation/blurtjs");
const mysql = require("mysql");
const moment = require('moment');
const Db    = require('./db.js');
const Sutils = require("./sutils");

let db          = new Db();
let settings    = [];
let list        = [];
let refreshTime = 5000;
let sutils      = new Sutils();
let min_weight  = 80;
let voting_power = 100;

async function main() {
    await data();
    setInterval(() => {
        data();
    }, refreshTime);
    
    broadcaster();
}
function data() {
    try {
        let connection = mysql.createConnection(db.dbConnection);
        connection.connect(async (err) => {
            if (err) throw err;
            settings = await db.getSettings(connection);
            list     = await db.getSevens(connection);
            if (settings[0].account != '') {
                let user = await sutils.customApi("condenser_api.get_accounts", [[settings[0].account]]); 
                user     = JSON.parse(user).result[0];
                voting_power = sutils.getVotingPower(user);
                min_weight   = settings[0].min_weight; 
            }
            setTimeout(() => {
                connection.end();
            }, refreshTime - 500);
        });
    } catch (error) {
        console.log("Error: " + error);
        data();
    }
}
function broadcaster() {
    blurt.api.setOptions({ url: 'https://rpc.blurt.world', useAppbaseApi: true });
    blurt.api.streamTransactions('head', (err, result) => {
        try {
            let txType = result.operations[0][0]
            let txData = result.operations[0][1]
            if (settings[0].account != '' && settings[0].key != '') {
                if(txType == 'comment') check(txData)
            }
        } catch (error) {
            console.log('error');
            broadcaster();
        }
    });
}

async function check(txData){
    let curator  = txData.author;
    let c_perm   = txData.permlink;
    let permlink = txData.parent_permlink;
    let body     = txData.body;
    let receiver = txData.parent_author;
    let command  = body.substring(0, 7);
    let weight   = parseInt(body.substring(8,11));
    // let weight   = 100;
    if (isFriend(curator) && receiver != '' && command == '!upvote') {
        if (curator == receiver) sendAlert(curator, c_perm, "Self-votes is not allowed");
        else {
            let post = await sutils.customApi('condenser_api.get_content', [receiver, permlink]);
            post     = JSON.parse(post).result;
        
            //checking the post to see if is already upvoted
            let has_voted = sutils.has_already_been_voted(settings[0].account, post);

            //checking times and setting limits in <5 min since creation and <12 hours before payout
            let creation = moment.utc(post.created);
            let cashout  = moment.utc(post.cashout_time)
            let now = moment.utc();
            let first = now.diff(creation, 'minutes');
            let last  = cashout.diff(now, 'hours');
        
            let payout_percent = parseFloat(post.max_accepted_payout);

            if (payout_percent == 0) sendAlert(curator, c_perm, "This post decline payments");
            else if (first < 5) sendAlert(curator, c_perm, "5 min since the post creation. Try again in a few minutes");
            else if (last < 12 && last >= 0) sendAlert(curator, c_perm, "12 hours before payout");
            else if (last < 0) sendAlert(curator, c_perm, "This post has been paid.");
            else if (has_voted.length > 0) sendAlert(curator, c_perm, "This post has already been voted."); 
            else sendVote(receiver, permlink, curator, weight, c_perm);
        }
        
    }
}
function savePost(author, permlink, curator, votes, weight) {
    try {
        let connection = mysql.createConnection(db.dbConnection);
        connection.connect(async (err) => {
            if (err) throw err; 
            let time = moment.utc().format('YYYY-MM-DD HH:mm:ss');
            connection.query(`INSERT INTO curation (curator, author, permlink, timestamp) VALUES ('${curator}', '${author}', '${permlink}', '${time}')`, (error, results) => {
                if (error) throw error;
                db.updateVote(connection, curator, votes - weight);
                setTimeout(() => {
                    connection.end();
                }, 3000); 
            }); 
        })
    } catch (error) {
        console.log(error);
    } 
}
function getVotes(curator) {
    return new Promise((resolve,reject) =>{
        let connection = mysql.createConnection(db.dbConnection);
        connection.connect(async (err) => {
            if (err) reject(err); 
            let votes = await db.getVotes(connection, curator);
            connection.end();
            resolve(votes)
        });
    }).then(r => { return r; })
      .catch(e => {console.log('Fail to get info. ' + e); return false;});
}
function isFriend(name){
    return (list.indexOf(name) > -1);
}
async function sendVote (parent_author, parent_permlink, curator, weight, c_perm) {
    let votes = await getVotes(curator);
    weight = (isNaN(weight))? 10000: weight*100;
    if (weight > 10000) weight = 10000;
    if (weight < 0) weight = 5000;
    console.log(voting_power, min_weight);
    if (settings[0].enabled == 1) {
        if (voting_power >= min_weight) {
            if (votes > 0) {
                let vote_weight_used = parseInt(weight/100);
                if (votes >= vote_weight_used) {
                    console.log('upvoting at..', parent_author, parent_permlink, weight, votes);
                    blurt.broadcast.vote(
                        settings[0].key, // posting wif
                        settings[0].account,
                        parent_author, 
                        parent_permlink, 
                        weight,
                        function (err, result) { 
                            if (err) console.log('Failure! ' + err);
                            else {
                                console.log('the post has been upvoted successfully!');
                                sendAlert(curator, c_perm, `the post has been upvoted successfully! Remaining bandwidth: ${votes - vote_weight_used}%`);
                                savePost(parent_author, parent_permlink, curator, votes, vote_weight_used);
                            }
                        }
                    ); 
                }else {
                    console.log(`Your bandwidth is less than the weight requested. Remaining bandwidth: ${votes}%`);
                    sendAlert(curator, c_perm, `Your bandwidth is less than the weight requested. Remaining bandwidth: ${votes}%`);
                }
            }else {
                console.log("You don't have enough bandwith today.");
                sendAlert(curator, c_perm, "You don't have enough bandwith.");
            }
        }else {
            console.log("Not enough voting power.");
            sendAlert(curator, c_perm, "Not enough voting power.");
        }
    }else {
        console.log("Hey! We are sleeping now, we'll back soon.");
        sendAlert(curator, c_perm, "Hey! We are sleeping now, we'll back soon.");
    }
    
}

function sendAlert (parent_author, parent_permlink, message) {
    let meta     = JSON.parse('{"app":"blurtseven/1.0"}');
    let permlink = "feedback-"+Math.random().toString(36).substring(2);
    blurt.broadcast.comment(
        settings[0].key, // posting wif
        parent_author, // author, leave blank for new post
        parent_permlink, // first tag
        settings[0].account, // username
        permlink, // permlink
        '', // Title
        message, // Body of post
        // json metadata (additional tags, app name, etc)
        meta,
        function (err, result) { 
            if (err) console.log('Failure! ' + err);
            else {
                console.log('Alert has been created successfully!');
            }
        }
    );  
}
main();