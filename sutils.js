const blurt = require("@blurtfoundation/blurtjs");
const fetch = require("node-fetch");
blurt.api.setOptions({ url: 'https://rpc.blurt.world', useAppbaseApi: true });
class Sutils {
    constructor(){
        this.server = "https://rpc.blurt.world"; 
    }
    getGlobalProps () {
        return new Promise((resolve, reject) => { 
        blurt.api.getDynamicGlobalProperties((err, result) => {
            if (result) {
                var per_mvest        = parseFloat(result.total_vesting_fund_blurt)*1000000/parseFloat(result.total_vesting_shares);
                var vesting          = parseFloat(result.total_vesting_shares)*1000000;
                result.per_mvest     = per_mvest;
                result.total_vesting = vesting;
                resolve(result);
            }else if(err) reject(err); 
        });
        }).then(resp => { return resp; })
          .catch(err => { return false; });
    }
    customApi (method, params) {
        return new Promise((resolve, reject) => {
            fetch(this.server, {
            method: "POST",
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({"jsonrpc":"2.0","method":method,"params":params,"id":1})
            }).then(response => { resolve(response.text());})
              .catch(error => { reject(error); });
        });
    } 
    has_already_been_voted(voter, post) {
        return post.active_votes.filter(el => el.voter === voter);
    }
    getVotingPower(account) {
        let voting_power  = account.voting_power,
        last_vote_time    = new Date(account.last_vote_time + "Z"),
        elapsed_seconds   = (new Date() - last_vote_time) / 1000,
        regenerated_power = Math.round(
        (10000 * elapsed_seconds) / (5 * 24 * 60 * 60)
        );
        let current_power = Math.min(voting_power + regenerated_power, 10000);
        return current_power/100;
    }
}

module.exports = Sutils;