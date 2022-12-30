# Tinkerers-Subject

Website: [Game](https://myzbai.github.io/TinkerersSubject)

The game is initialized with a configuration json file. This allows for the community to create their own version of gameplay.


### Create your own *Configuration* (VSCode/Node)
* Fork this repository [Docs](https://docs.github.com/en/get-started/quickstart/fork-a-repo)
* Clone the forked repository [Docs](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)
* Run *npm install* to install dependencies
* Run *npm run build* to build
* Change *"env": "production"* to *"env": "dev-config"* in *public/env.json*
* If you change file path of your config file (directory or filename) make sure *"gConfigPath"* is pointing to the new path
* (Optional) Install Live Server to refresh browser automatially when you modify the file
* Helper methods are available in your browsers devtools inside an object called TS

### Include your *Configuration* in the *ConfigList.json*
* Make sure you have a fork of this repo
* Create a new branch
* Add an object in *public/gconfig/configList.json* "list": []
* Commit your changes
* Make a Pull Request to merge your branch into this repo's main branch
