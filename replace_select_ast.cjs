const fs = require('fs');
const glob = require('glob');

const files = glob.sync('views/*.tsx');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    let index = 0;
    while ((index = content.indexOf('<select\n', index)) !== -1 || (index = content.indexOf('<select ', index)) !== -1) {
        let valueIndex = content.indexOf('value={item.item}', index);
        let endSelectIndex = content.indexOf('</select>', index);

        // If it's the right select block
        if (valueIndex > index && valueIndex < endSelectIndex) {
            let selectBlock = content.substring(index, endSelectIndex + 9);
            
            // extract onChange body
            let onChangeStart = selectBlock.indexOf('onChange={(e) => {');
            if(onChangeStart === -1) onChangeStart = selectBlock.indexOf('onChange={e => {');
            
            let onChangeEnd = -1;
            let braces = 0;
            for(let i = onChangeStart + 'onChange={'.length; i < selectBlock.length; i++) {
                if(selectBlock[i] === '{') braces++;
                else if (selectBlock[i] === '}') {
                    braces--;
                    if(braces === 0) {
                        onChangeEnd = i;
                        break;
                    }
                }
            }

            if(onChangeStart !== -1 && onChangeEnd !== -1) {
                let onChangeBody = selectBlock.substring(onChangeStart, onChangeEnd + 1);
                // remove `(e) => {` and closing `}`
                let body = onChangeBody.replace(/^onChange=\{\s*\(?e\)?\s*=>\s*\{/, '').replace(/\}$/, '');
                // change `e.target.value` to `val`
                body = body.replace(/const val = e\.target\.value;?/, '').replace(/e\.target\.value/g, 'val');

                // extract options array name (inventoryItems or dbInventory)
                let optionsMapMatch = selectBlock.match(/\{([a-zA-Z0-9_]+)\.map\(/);
                let optionsArray = optionsMapMatch ? optionsMapMatch[1] : 'inventoryItems';

                let replacement = `<SearchableSelect
                                                            value={item.item}
                                                            onChange={(val) => {
                                                                ${body.trim()}
                                                            }}
                                                            options={[
                                                                { label: 'Select Item', value: 'Select Item' },
                                                                ...${optionsArray}.map((inv: any) => ({ label: inv.itemName || '', value: inv.itemName || '' }))
                                                            ]}
                                                        />`;

                content = content.substring(0, index) + replacement + content.substring(endSelectIndex + 9);
                index += replacement.length;
            } else {
                index = endSelectIndex + 9;
            }
        } else {
            index = index + 7;
        }
    }

    if (content !== original) {
        if (content.includes('SearchableSelect') && !content.includes('import { SearchableSelect }')) {
             content = content.replace(/(import\s+React[^;]*;)/, "$1\nimport { SearchableSelect } from '../components/shared/SearchableSelect';");
        }
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
