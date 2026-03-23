// Кроссворды по уровням JLPT
window.crosswordsData = {
    n5: {
        name: "JLPT N5",
        puzzles: [
            {
                name: "Кроссворд 1",
                width: 8,
                height: 6,
                words: [
                    { word: "ニホンゴ", row: 3, col: 0, dir: "across", clue: "Японский язык" },
                    { word: "ウンテンシユ", row: 0, col: 2, dir: "down", clue: "Водитель" },
                    { word: "デンワバンゴウ", row: 1, col: 1, dir: "across", clue: "Номер телефона" },
                    { word: "ギンコウ", row: 0, col: 5, dir: "down", clue: "Банк" },
                ]
            },
            // Пример второго кроссворда для N5 (можно добавить позже)
            // {
            //     name: "Кроссворд 2",
            //     width: 6,
            //     height: 6,
            //     words: [...]
            // }
        ]
    },
    n4: {
        name: "JLPT N4",
        puzzles: [
            {
                name: "Кроссворд 1",
                width: 8,
                height: 8,
                words: [
                    { word: "デンシャ", row: 0, col: 1, dir: "across", clue: "Электричка, поезд" },
                    { word: "ヨミカタ", row: 3, col: 0, dir: "across", clue: "Способ чтения (как читается)" },
                    { word: "ハナシ", row: 5, col: 2, dir: "across", clue: "Разговор, история" },
                    { word: "テンプラ", row: 1, col: 4, dir: "down", clue: "Блюдо во фритюре" },
                    { word: "マチ", row: 2, col: 6, dir: "down", clue: "Город" },
                    { word: "アメ", row: 4, col: 1, dir: "down", clue: "Дождь / конфета" }
                ]
            }
        ]
    },
    n3: {
        name: "JLPT N3",
        puzzles: [
            {
                name: "Кроссворд 1",
                width: 9,
                height: 9,
                words: [
                    { word: "ケイザイ", row: 0, col: 2, dir: "across", clue: "Экономика" },
                    { word: "セイジ", row: 2, col: 1, dir: "across", clue: "Политика" },
                    { word: "ブンカ", row: 4, col: 0, dir: "across", clue: "Культура" },
                    { word: "レキシ", row: 6, col: 3, dir: "across", clue: "История" },
                    { word: "ガクシュウ", row: 1, col: 5, dir: "down", clue: "Обучение" },
                    { word: "ケンキュウ", row: 3, col: 7, dir: "down", clue: "Исследование" }
                ]
            }
        ]
    },
    n2: {
        name: "JLPT N2",
        puzzles: [
            {
                name: "Кроссворд 1",
                width: 10,
                height: 10,
                words: [
                    { word: "チョウサ", row: 0, col: 3, dir: "across", clue: "Расследование, исследование" },
                    { word: "ハッテン", row: 2, col: 1, dir: "across", clue: "Развитие" },
                    { word: "カンリョウ", row: 4, col: 2, dir: "across", clue: "Чиновник, бюрократ" },
                    { word: "コクサイ", row: 6, col: 0, dir: "across", clue: "Международный" },
                    { word: "ジョウホウ", row: 1, col: 5, dir: "down", clue: "Информация" },
                    { word: "イノベーション", row: 3, col: 7, dir: "down", clue: "Инновация" }
                ]
            }
        ]
    },
    n1: {
        name: "JLPT N1",
        puzzles: [
            {
                name: "Кроссворд 1",
                width: 12,
                height: 12,
                words: [
                    { word: "ジッソウ", row: 0, col: 2, dir: "across", clue: "Внедрение, реализация" },
                    { word: "ソウゴウテキ", row: 2, col: 1, dir: "across", clue: "Комплексный, всесторонний" },
                    { word: "ケイショウ", row: 4, col: 4, dir: "across", clue: "Наследование" },
                    { word: "ホショウ", row: 6, col: 0, dir: "across", clue: "Гарантия" },
                    { word: "チイキ", row: 1, col: 8, dir: "down", clue: "Регион, район" },
                    { word: "サクセイ", row: 3, col: 5, dir: "down", clue: "Составление (документа)" }
                ]
            }
        ]
    }
};
