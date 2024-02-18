let number = []
for (let i = 0; i <= 53; i++) {
    number.push(i)
}
number = number.sort(() => {
    return .5 - Math.random()
})
let leftNumber = number.slice(0, 18)
let rightNumber = number.slice(18, 18 * 2)
let upNumber = number.slice(18 * 2, 18 * 3)
let leftCard = []
let flower = ['spade', 'wintersweet', 'block', 'heart']
let value = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'J', 'Q', 'K']
for (let i = 0; i < 54; i++) {
    console.log(flower[parseInt(i / 13)], value[i % 13])
}