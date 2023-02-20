# Tinkerers Subject

Play the game [here](https://myzbai.github.io/TinkerersSubject)

##### Note
The game is initialized with a *Configuration* file. This allows for players to play the game in many different ways. 

A *Configuration* file is stored in a json format, thus making it easy for everyone to create their own.


## Create your own *Configuration* (Require NodeJS & Git)
#### Setup
* Fork this repository [Docs](https://docs.github.com/en/get-started/quickstart/fork-a-repo)
* Clone the forked repository [Docs](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)

* Run ```npm install``` to install dependencies
* Run ```npm run build``` to build project

#### Modify existing *Configuration*
* Open demo.json at [public/gconfig/demo.json](public/gconfig/demo.json)

#### Create new *Configuration*
* Create a new file at [public/gconfig](public/gconfig)
* Include file at [public/gconfig/configList.json](public/gconfig/configList.json)

#### Submit your *Configuration*
* Create a new branch
* Add an object in *public/gconfig/configList.json* "list": []
* Commit your changes
* Make a Pull Request to merge your branch into this repo's main branch
