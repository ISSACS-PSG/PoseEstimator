# Human Goniometer

This project is a small static site built on top of [p5.js](https://p5js.org) and [MoveNet](https://tensorflow.google.cn/hub/tutorials/movenet) to estimate, visualize and record poses using a webcam.


## Getting Started

The site is composed of static html, css, and javascript files and can run directly in your favorite browser. You will need an internet connection because the p5.js and MoveNet dependencies are loaded from a CDN.

These instructions will give you a copy of the project up and running on
your local machine for development and testing purposes. See deployment
for notes on deploying the project on a live system.

### Prerequisites for Deploying to AWS

To publish this site to AWS using [CloudFormation](https://aws.amazon.com/cloudformation/), [CloudFront](https://aws.amazon.com/cloudfront/) and [S3](https://aws.amazon.com/s3), you need and active AWS account and the [aws-cli](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html) installed and [configured](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html).


## Deployment

If you have your own webhost, just copy all files in the [`src`](./src) to the host. If you'd like to deploy to AWS using [CloudFormation](https://aws.amazon.com/cloudformation/), [CloudFront](https://aws.amazon.com/cloudfront/) and [S3](https://aws.amazon.com/s3), use the included [`deploy.sh`](./deploy.sh) to setup the stack and deploy the code.

```shell
./deploy.sh
```

Once you've setup your stack, you use the following to only push code changes:

```shell
./deploy.sh code
```


## Built With
	
- [p5.js](https://p5js.org)
- [MoveNet](https://tensorflow.google.cn/hub/tutorials/movenet)
- [Choose a License](https://choosealicense.com) - Used to choose the license


## Authors

  - **Chris Nurre:** [GitHub: cnurre](https://github.com/cnurre)


## License

This project is licensed under the [The MIT License (MIT)](LICENSE) - see the [LICENSE](LICENSE) file for
details
