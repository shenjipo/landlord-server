const WebSocket = require('ws')

const server = new WebSocket.Server({ port: 3005 })


const express = require("express")
const router = express.Router()
class Utils {
    static copy(data) {
        return JSON.parse(JSON.stringify(data))
    }
}
let channelStatus = []
for (let i = 0; i < 15; i++) {
    channelStatus.push({
        id: i,
        name: `第${i}桌`,
        children: {
            up: {
                name: '',
                uuid: '',
                state: '',
                cardList: [],
            },
            left: {
                name: '',
                uuid: '',
                state: '',
                cardList: [],
            },
            right: {
                name: '',
                uuid: '',
                state: '',
                cardList: [],
            },
            hiddenCard: [],
            progress: []
        }
    })
}
// 查询
router.post("/saveBlog", async (req, res) => {
    let token = req.headers['authorization']
    let err = null
    if (err == null) {
        res.send({
            code: 200,
            data: {
                id: id
            },
            msg: "添加成功"
        })
    } else {
        res.send({
            code: 500,
            msg: "添加失败",
            data: {}
        })
    }

})

let mp = new Map()

const broadcastMessage = (actionName, data) => {
    // 广播消息给所有客户端

    if (server.clients.size === 0) return

    server.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ actionName, data }));
        }
    });
}
setInterval(() => {

    broadcastMessage('updataWaitingInfo', channelStatus)
}, 2000)
const sendGroupMessage = (group, actionName, data) => {
    // 广播消息给指定客户端
    group.forEach(item => {
        mp.get(item).send(JSON.stringify({ actionName, data }))
    })

}

server.on('connection', (ws, req) => {
    const ip = req.connection.remoteAddress;
    const port = req.connection.remotePort;
    const clientName = ip + port;
    console.log(`收到客户端连接请求`)
    // 用户进入等候大厅坐下
    const handleSitting = ({ index, type, name, uuid }) => {
        console.log(`用户: ${name}--${uuid}进入等候大厅`)
        // 存储这个客户端
        mp.set(uuid, ws)
        // 先看下这个人是不是已经有座位了，如果有，先清除掉
        channelStatus.forEach(item => {
            if (item.children['up'].uuid === uuid) {
                item.children['up'].uuid = ''
                item.children['up'].name = ''
            } else if (item.children['left'].uuid === uuid) {
                item.children['left'].uuid = ''
                item.children['left'].name = ''
            } else if (item.children['right'].uuid === uuid) {
                item.children['right'].uuid = ''
                item.children['right'].name = ''
            }
        })

        // 用户进入等待区
        channelStatus[index].children[type] = {
            name: name,
            uuid: uuid,
        }
        // 通知更新等候室信息
        broadcastWaitingRoom()
        //判断等待区是否满足三个人
        if (channelStatus[index].children['up'].name.length &&
            channelStatus[index].children['left'].name.length &&
            channelStatus[index].children['right'].name.length) {

            sendGroupMessage([channelStatus[index].children['up'].uuid,
            channelStatus[index].children['left'].uuid,
            channelStatus[index].children['right'].uuid], 'goRoom', { roomId: index })
        }

    }
    // 广播等候大厅人员信息
    const broadcastWaitingRoom = () => {
        broadcastMessage('updataWaitingInfo', channelStatus)
    }



    // 有人进入打牌房间，人满则开局
    const roomWaiting = ({ channelId, type }) => {
        console.log(`房间${channelId}位置${type}进来人了,准备开局!`)
        channelStatus[channelId].children[type].status = 'prepared'

        if (channelStatus[channelId].children['left'].status === 'prepared' &&
            channelStatus[channelId].children['right'].status === 'prepared' &&
            channelStatus[channelId].children['up'].status === 'prepared') {
            console.log('开局')
            // 生成随机数
            let number = []
            for (let i = 0; i <= 53; i++) {
                number.push(i)
            }
            number = number.sort(() => {
                return .5 - Math.random()
            })
            let leftNumber = number.slice(0, 17)
            let rightNumber = number.slice(17, 17 * 2)
            let upNumber = number.slice(17 * 2, 17 * 3)
            let hiddenNumber = number.slice(17 * 3, 54)

            let [leftCard, rightCard, downCard, hiddenCard] = [[], [], [], []]
            let flower = ['spade', 'wintersweet', 'block', 'heart']
            let value = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'J', 'Q', 'K']
            const getCardList = (number) => {
                let temp = []
                for (let i = 0; i < number.length; i++) {
                    if (number[i] === 52) {
                        temp.push({
                            cardState: 'normal',
                            cardType: 'ghost',
                            cardClass: '',
                            cardValue: 'SmallGhost'
                        })
                    } else if (number[i] === 53) {
                        temp.push({
                            cardState: 'normal',
                            cardType: 'ghost',
                            cardClass: '',
                            cardValue: 'BigGhost'
                        })
                    } else {
                        temp.push({
                            cardState: 'normal',
                            cardType: flower[parseInt(number[i] / 13)],
                            cardClass: '',
                            cardValue: value[number[i] % 13]
                        })
                    }
                }
                return temp
            }
            leftCard = getCardList(leftNumber)
            rightCard = getCardList(rightNumber)
            downCard = getCardList(upNumber)
            hiddenCard = getCardList(hiddenNumber)
            let random = Math.random()
            let turn = random < 0.33 ? 'left' : random < 0.66 ? 'right' : 'down'
            channelStatus[channelId].children['left'].cardList = leftCard
            channelStatus[channelId].children['right'].cardList = rightCard
            channelStatus[channelId].children['up'].cardList = downCard
            channelStatus[channelId].hiddenCard = hiddenCard
            sendGroupMessage([
                channelStatus[channelId].children['left'].uuid,
                channelStatus[channelId].children['right'].uuid,
                channelStatus[channelId].children['up'].uuid,
            ], 'grabbingLandlords', { turn: turn, status: 'grabbingLandlords', leftCard: leftCard, rightCard: rightCard, downCard: downCard, hiddenCard: hiddenCard })


        }


    }
    // 更新时间
    const updateTime = ({ time, index, position }) => {
        let pos = ['left', 'right', 'up']
        pos = pos.filter(item => item !== position)

        sendGroupMessage([channelStatus[index].children[pos[0]].uuid, channelStatus[index].children[pos[1]].uuid],
            'updateRoomTime', { time: time })
    }
    // 有人抢地主
    const handleGrab = ({ index, position }) => {
        let leftCard = Utils.copy(channelStatus[index].children['left'].cardList)
        let rightCard = Utils.copy(channelStatus[index].children['right'].cardList)
        let downCard = Utils.copy(channelStatus[index].children['up'].cardList)

        let hidden = channelStatus[index].hiddenCard.map(item => {
            return {
                ...item,
                cardState: 'selected'
            }
        })
        if (position === 'left') {
            leftCard = [...leftCard, ...hidden]
        } else if (position === 'right') {
            rightCard = [...rightCard, ...hidden]
        } else {
            downCard = [...downCard, ...hidden]
        }
        channelStatus[index].children['left'].cardList = leftCard
        channelStatus[index].children['right'].cardList = rightCard
        channelStatus[index].children['up'].cardList = downCard
        sendGroupMessage([
            channelStatus[index].children['left'].uuid,
            channelStatus[index].children['right'].uuid,
            channelStatus[index].children['up'].uuid,
        ], 'updateCardInfo', { turn: position, leftCard: leftCard, rightCard: rightCard, downCard: downCard, state: 'firstPlay', progress: [] })
    }
    // 获取下一轮出牌的人
    const getNextTurn = (position) => {
        let nextTurn = ''
        if (position === 'left') {
            nextTurn = 'down'
        } else if (position === 'right') {
            nextTurn = 'left'
        } else {
            nextTurn = 'right'
        }
        return nextTurn
    }
    // 有人放弃地主
    const giveUpGrab = ({ index, position }) => {
        let nextTurn = getNextTurn(position)
        sendGroupMessage([
            channelStatus[index].children['left'].uuid,
            channelStatus[index].children['right'].uuid,
            channelStatus[index].children['up'].uuid,
        ], 'updateLandlordTurn', { turn: nextTurn })
    }

    // 有人出牌
    const playCard = ({ index, position, playCardList, playCardType, ownCardList }) => {
        let nextTurn = getNextTurn(position)
        channelStatus[index].children.progress.push({
            pos: position,
            card: playCardList,
            cardType: playCardType
        })
        channelStatus[index].children[position].cardList = ownCardList
        // 游戏结束

        if (ownCardList.length === 0) {
            sendGroupMessage([
                channelStatus[index].children['left'].uuid,
                channelStatus[index].children['right'].uuid,
                channelStatus[index].children['up'].uuid,
            ], 'endPlay')
            // 清空数据
            channelStatus[index].children['left'] = { name: '', uuid: '', state: '', cardList: [] }
            channelStatus[index].children['right'] = { name: '', uuid: '', state: '', cardList: [] }
            channelStatus[index].children['up'] = { name: '', uuid: '', state: '', cardList: [] }
            channelStatus[index].hiddenCard = []
            channelStatus[index].progress = []
            return
        }

        let leftCard = channelStatus[index].children['left'].cardList
        let rightCard = channelStatus[index].children['right'].cardList
        let downCard = channelStatus[index].children['up'].cardList

        sendGroupMessage([
            channelStatus[index].children['left'].uuid,
            channelStatus[index].children['right'].uuid,
            channelStatus[index].children['up'].uuid,
        ], 'updateCardInfo', {
            turn: nextTurn, leftCard: leftCard, rightCard: rightCard, downCard: downCard,
            state: 'playing', progress: channelStatus[index].children.progress, currentCard: playCardList
        })
    }
    // 有人放弃出牌
    const notPlayCard = ({ index, position }) => {
        let nextTurn = getNextTurn(position)
        channelStatus[index].children.progress.push({
            pos: position,
            card: [],
            cardType: null
        })
        let leftCard = channelStatus[index].children['left'].cardList
        let rightCard = channelStatus[index].children['right'].cardList
        let downCard = channelStatus[index].children['up'].cardList
        let progressLength = channelStatus[index].children.progress.length

        let currentCard = null
        if (progressLength > 2 && channelStatus[index].children.progress[progressLength - 1].cardType === null
            && channelStatus[index].children.progress[progressLength - 2].cardType === null) {
            currentCard = []
        }
        sendGroupMessage([
            channelStatus[index].children['left'].uuid,
            channelStatus[index].children['right'].uuid,
            channelStatus[index].children['up'].uuid,
        ], 'updateCardInfo', {
            turn: nextTurn, leftCard: leftCard, rightCard: rightCard, downCard: downCard,
            state: 'playing', progress: channelStatus[index].children.progress, currentCard,
        })
    }
    ws.on('message', (ev) => {
        message = JSON.parse(ev)

        switch (message.actionName) {
            case 'sitting':
                handleSitting(message.data)
                break
            case "roomWaiting":
                roomWaiting(message.data)
                break
            case 'updateTime':
                updateTime(message.data)
                break
            case 'giveUpLandlord':
                giveUpGrab(message.data)
                break
            case 'grabLandlord':
                handleGrab(message.data)
                break
            case 'playCard':

                playCard(message.data)
                break
            case 'notPlayCard':
                notPlayCard(message.data)
                break

        }
    });

    ws.on('close', (code, msg) => {
        let leftName = ''
        for (let key of mp.keys()) {
            if (mp.get(key) === ws) {
                channelStatus.forEach(item => {
                    if (item.children['left'].uuid === key) {
                        item.children['left'].uuid = ''
                        item.children['left'].name = ''
                        item.children['left'].state = ''
                    } else if (item.children['up'].uuid === key) {
                        item.children['up'].uuid = ''
                        item.children['up'].name = ''
                        item.children['up'].state = ''
                    } else if (item.children['right'].uuid === key) {
                        item.children['right'].uuid = ''
                        item.children['right'].name = ''
                        item.children['right'].state = ''
                    }
                })
                console.log(`${key}--客户退出`)
                mp.delete(key)
            } else {
                leftName = leftName + key + ','
            }
        }
        console.log(`剩余如下客户: ${leftName}`)
    });


})


module.exports = { router, server }
