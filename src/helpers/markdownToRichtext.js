// import MarkdownIt from 'markdown-it';
// import { JSDOM } from 'jsdom';

// export function markdownToRichtext(markdown) {
//     // Ініціалізуємо markdown-it
//     const md = new MarkdownIt();

//     // Отримуємо HTML з Markdown
//     const htmlContent = md.render(markdown);

//     // Функція для перетворення HTML у структуру Richtext
//     function htmlToRichtext(html) {
//         const dom = new JSDOM(html);
//         const doc = dom.window.document;

//         function parseNode(node) {
//             // Якщо у вузла є дочірні елементи
//             if (node.childNodes && node.childNodes.length > 0) {
//                 return {
//                     type: 'paragraph',
//                     content: Array.from(node.childNodes).map(parseNode).filter(Boolean),
//                 };
//             }

//             // Перевірка для різних HTML тегів
//             if (node.nodeName === 'P') {
//                 return {
//                     type: 'paragraph',
//                     content: node.childNodes.map(parseNode).filter(Boolean),
//                 };
//             }

//             if (node.nodeName === 'STRONG' || node.nodeName === 'B') {
//                 return {
//                     type: 'text',
//                     text: node.textContent,
//                     marks: [{ type: 'strong' }],
//                 };
//             }

//             if (node.nodeName === 'EM' || node.nodeName === 'I') {
//                 return {
//                     type: 'text',
//                     text: node.textContent,
//                     marks: [{ type: 'em' }],
//                 };
//             }

//             if (node.nodeName === 'H1') {
//                 return {
//                     type: 'heading',
//                     attrs: { level: 1 },
//                     content: [{ type: 'text', text: node.textContent }],
//                 };
//             }

//             if (node.nodeName === 'H2') {
//                 return {
//                     type: 'heading',
//                     attrs: { level: 2 },
//                     content: [{ type: 'text', text: node.textContent }],
//                 };
//             }

//             if (node.nodeName === 'H3') {
//                 return {
//                     type: 'heading',
//                     attrs: { level: 3 },
//                     content: [{ type: 'text', text: node.textContent }],
//                 };
//             }

//             if (node.nodeName === 'UL') {
//                 return {
//                     type: 'bullet_list',
//                     content: Array.from(node.children).map((li) => ({
//                         type: 'list_item',
//                         content: [{ type: 'paragraph', content: [{ type: 'text', text: li.textContent }] }],
//                     })),
//                 };
//             }

//             if (node.nodeName === 'OL') {
//                 return {
//                     type: 'ordered_list',
//                     content: Array.from(node.children).map((li) => ({
//                         type: 'list_item',
//                         content: [{ type: 'paragraph', content: [{ type: 'text', text: li.textContent }] }],
//                     })),
//                 };
//             }

//             if (node.nodeName === 'LI') {
//                 return {
//                     type: 'list_item',
//                     content: [{ type: 'paragraph', content: [{ type: 'text', text: node.textContent }] }],
//                 };
//             }

//             // Для інших випадків повертаємо текстовий вузол
//             return node.nodeValue && node.nodeValue.trim() !== ''
//                 ? { type: 'text', text: node.nodeValue.trim() }
//                 : null;
//         }

//         return {
//             type: 'doc',
//             content: Array.from(doc.body.childNodes)
//                 .map(parseNode)
//                 .filter(Boolean),  // Видалити порожні елементи
//         };
//     }

//     return htmlToRichtext(htmlContent);
// }

import pkg from '@contentful/rich-text-from-markdown';
const { richTextFromMarkdown } = pkg;

export async function markdownToRichtext(markdown) {
    const richText = await richTextFromMarkdown(markdown);

    return richText;
}
