# fetchforge

[![Build Status](https://travis-ci.org/Didstopia/fetchforge.svg?branch=master)](https://travis-ci.org/Didstopia/fetchforge)
[![Greenkeeper badge](https://badges.greenkeeper.io/Didstopia/fetchforge.svg)](https://greenkeeper.io/)

Fetchforge is a command line application for downloading clips from [forge.gg](https://forge.gg/).

## Installation

See [Releases](https://github.com/Didstopia/fetchforge/releases) for the latest versions.

## Usage (Simple)

Run interactively by running without any arguments:

> fetchforge

You can also specify parameters manually (username is the only required parameter):

> fetchforge Dids

## Usage (Advanced)

To see a list of options:

> fetchforge --help

Run with verbose logging, override download path and set the username:

> fetchforge --verbose --path ~/Downloads Dids

## Development

```sh
npm i
npm link

fetchforge download Dids
```

## Disclaimer

Fetchforge is in no way affiliated with, authorized, maintained or endorsed by [forge.gg](https://forge.gg/) or any of its affiliates or subsidiaries. This is an independent and unofficial project. Use at your own risk.

Fetchforge is licensed under the MIT license. Refer to [LICENSE](LICENSE) file for more information.
