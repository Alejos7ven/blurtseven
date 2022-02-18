# blurtseven curation tool

This is a simple installable tool to upvote post on the blurt blockchain by leaving commands that calls a curator account to vote on a target post.

## Requeriments

- NodeJS v14 or above.
- Cronjob usage.
- PhpMyAdmin an MySQL DB.

## Installation

Once cloned the Github repo move to the project folder and do the following steps:

1-) Go to your phpmyadmin and create a new database, then import the ```blurtseven.sql``` file.
    - On **settings** table add your curation account including the posting key in a new row.
    - On **users** table you will be able to add as much users as you want which will have access to your curation account via comments.
    - On **curation** table you will get a detailed log of posts curated.
2-) Run on bash ```npm i```
3-) Create a ```.env``` file with the following structure:
    > HOST=localhost
    > DB=blurtseven
    > USER=root
    > PASSWORD=
    > DEFAULT_BANWIDTH=1000

    set your DB connection and the default Banwidth  that each curator will have.
4-) Run the script ```commands.js```, we suggest use PM2.
5-) Install a cronjob which will reset the curators banwidth everytime.
    ```0 20 * * * node /var/www/html/bot/refresh.js```

## You are done.
