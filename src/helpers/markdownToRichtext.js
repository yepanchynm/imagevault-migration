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

// import pkg from '@contentful/rich-text-from-markdown';
// const { richTextFromMarkdown } = pkg;

// export async function markdownToRichtext(markdown) {
//     const richText = await richTextFromMarkdown(markdown);

//     return richText;
// }
import MarkdownIt from 'markdown-it';

export function markdownToStoryblokRichtext(markdown) {
  const md = new MarkdownIt();
  const tokens = md.parse(markdown, {});
  const richText = {
    type: 'doc',
    content: [],
  };

  let currentList = null;

  tokens.forEach((token, idx) => {
    if (token.type === 'bullet_list_open') {
      currentList = {
        type: 'bullet_list',
        content: [],
      };
    } else if (token.type === 'list_item_open') {
      const listItem = {
        type: 'list_item',
        content: [],
      };
      const nextToken = tokens[idx + 2]; // assuming paragraph is next
      if (nextToken.type === 'inline') {
        const textNodes = parseInlineTokens(nextToken.children);
        listItem.content.push({
          type: 'paragraph',
          content: textNodes,
        });
      }
      currentList?.content.push(listItem);
    } else if (token.type === 'bullet_list_close') {
      richText.content.push(currentList);
      currentList = null;
    }
  });

  return richText;
}

function parseInlineTokens(inlineTokens) {
  const result = [];
  let marks = [];

  inlineTokens.forEach(token => {
    if (token.type === 'text') {
      result.push({ type: 'text', text: token.content, ...(marks.length ? { marks: [...marks] } : {}) });
    } else if (token.type === 'strong_open') {
      marks.push({ type: 'bold' });
    } else if (token.type === 'strong_close') {
      marks = marks.filter(mark => mark.type !== 'bold');
    } else if (token.type === 'em_open') {
      marks.push({ type: 'italic' });
    } else if (token.type === 'em_close') {
      marks = marks.filter(mark => mark.type !== 'italic');
    }
  });

  return result;
}

import { promises as fs, existsSync, mkdirSync } from 'fs';
fs.writeFile('test.json', JSON.stringify(markdownToStoryblokRichtext('- 16 **illuminators** and four eye cameras integrated into ***scratch-resistant*** lenses \n\n- Scene camera with a 106° field of view \n\n- Built-in microphone captures environmental sound for more context \n\n- Robust design that fits under headwear and protective gear \n\n- Optional lens accessories for sun and dust protection, eyesight correction, and reflective markers for motion capture compatibility')))

