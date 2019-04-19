# WECHATY-PUPPET-IOSBIRD

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-blue.svg)](https://github.com/chatie/wechaty)
[![npm version](https://badge.fury.io/js/wechaty-puppet-iosbird.svg)](https://badge.fury.io/js/wechaty-puppet-iosbird)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/cb818825ff8146bab6a040febb5bd3c3)](https://app.codacy.com/app/windmemory/wechaty-puppet-padpro?utm_source=github.com&utm_medium=referral&utm_content=botorange/wechaty-puppet-padpro&utm_campaign=Badge_Grade_Settings)

这个模块是通过ios系统中[越狱插件](https://github.com/botorange/wechaty-puppet-iosbird/wiki/Jail-Break)作为中转，连接微信和WebSocket Server，实现个人号的微信接口。

这个模块是基于[Wechaty](https://github.com/Chatie/wechaty/) 的子模块，专门针对ios 接入的。wechaty 是一个开源的的 **个人号** 微信机器人接口，是一个使用Typescript 构建的Node.js 应用。支持多种微信接入方案，包括网页，ipad，ios，windows， android 等。同时支持[Linux](https://travis-ci.com/chatie/wechaty), [Windows](https://ci.appveyor.com/project/chatie/wechaty), [Darwin\(OSX/Mac\)](https://travis-ci.com/chatie/wechaty) 和 [Docker](https://app.shippable.com/github/Chatie/wechaty) 多个平台。

只需要6行代码，你就可以 **通过个人号** 搭建一个 **微信机器人功能** ，用来自动管理微信消息。

更多功能包括：

* 消息处理：关键词回复
* 群管理：自动入群，拉人，踢人
* 自动处理好友请求
* 智能对话：通过简单配置，即可加入智能对话系统，完成指定任务
* ... 请自行开脑洞

详情请看[Wechaty](https://github.com/chatie/wechaty)项目 [![NPM Version](https://badge.fury.io/js/wechaty.svg)](https://badge.fury.io/js/wechaty) [![Docker Pulls](https://img.shields.io/docker/pulls/zixia/wechaty.svg?maxAge=2592000)](https://hub.docker.com/r/zixia/wechaty/) [![TypeScript](https://img.shields.io/badge/<%2F>-TypeScript-blue.svg)](https://www.typescriptlang.org/)

## 安装

```shell
npm install wechaty
npm install wechaty-puppet-iosbird
```

## 示例代码

```ts
import { Wechaty }        from 'wechaty'
import { PuppetIosbird }  from 'wechaty-puppet-iosbird'

const puppet = new PuppetIosbird()

const bot = new Wechaty({
  puppet,
})

// 设置完成

// 运行 wechaty
bot
.on('login',            user => console.log(`User ${user} logined`))
.on('message',       message => console.log(`Message: ${message}`))
.start()
```

<font  color="#dd0000">运行时， 需要指定环境变量[微信ID](https://github.com/botorange/wechaty-puppet-iosbird/wiki/Jail-Break#查看是否成功并获取微信id)： `BOT_ID`</font>

## 文档

[https://docs.chatie.io/wechaty](https://docs.chatie.io/wechaty)

## 获取Token

![contact](./image/contact.gif)

[了解更多Token 相关内容](https://github.com/lijiarui/wechaty-puppet-padchat/wiki/%E8%B4%AD%E4%B9%B0token)

## LICENSE

Apache-2.0
