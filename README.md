# Fugu

Fugu is a open source, light-weight, reliable, publish-subscribe model based real-time chat platform.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

First and foremost [Node.js](https://nodejs.org/en/download/) is required to get fugu up and running.
You can install node.js via downloading official [node.js](https://nodejs.org/en/download/) package which is suitable for your environment.


### Installation

Follow the instructions below to get start your own fugu on your local machine.

1. Make sure your current working directory is fugu.

2. Start local server on 3000 port(default) with  dev environment configuration using command below.

  ```
  NODE_ENV=dev node server.js
  ```

 To run a custom  environment, create a new file production.json in configuration folder and run using  ```NODE_ENV=production node server.js``` command.

 To change port you can use configuration at run time by specifying  ```NODE_ENV=production PORT=<custom port> node server.js``` or by changing particular configuration file.

## Features

- Direct Messaging
- Multiple Chat Rooms
- Private Groups
- Public Groups
- Mobile Notifications
- Desktop Notifications
- Tagging
- User profile
- Markdown
- Emojis
- Gifs
- File sharing - S3 uploads
- Group Search
- User Search


## Built With

* [ExpressJs](https://github.com/expressjs/express) - Fast, unopinionated, minimalist web framework for node.
* [Faye](https://github.com/faye/faye) - A publish-subscribe messaging system based on the Bayeux protocol.

## Contributing

Please read [CONTRIBUTING.md](https://) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/Jungle-Works/fugu/tags).

