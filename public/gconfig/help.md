## Create your own game configuration


### Develop your own configuration
* [Fork](https://github.com/MyzBai/TinkerersSubject/fork) and [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repository.
* Create a new json file and use [demo.json](demo.json) as an example
* Now include your new file in the [Config List](configList.json), The value of `"rawUrl"` should be an absolute path from your root where index.html is located.


### Include your configuration in the official game
* [Sync](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork) your forked repository
* Make a new branch.
* Add a new element in the [Config List](configList.json) like you've done before but now make the value of `"rawUrl"` be the url of your raw file in your repository.
Example: `https://raw.githubusercontent.com/USERNAME/REPOSITORY_NAME/BRANCH_NAME/public/gconfig/your-file-name.json`
* If you're new to Pull Requests, you can read about it [here](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests)
