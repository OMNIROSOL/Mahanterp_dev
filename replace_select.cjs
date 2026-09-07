const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('views/*.tsx');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    const selectRegex = /<select\s+value=\{item\.item\}\s+onChange=\{\(e\) => \{\s+const val = e\.target\.value;\s+([\s\S]*?)\}\}\s+className="[^"]+"\s*>\s*<option value="Select Item">Select Item<\/option>\s*\{inventoryItems\.map\([^)]+\) => \(\s*<option[^>]+>\{[^}]+\}<\/option>\s*\)\)\}\s*<\/select>/g;

    if (selectRegex.test(content)) {
        content = content.replace(selectRegex, (match, body) => {
            return `<SearchableSelect
                                                            value={item.item}
                                                            onChange={(val) => {
                                                                ${body.trim()}
                                                            }}
                                                            options={[
                                                                { label: 'Select Item', value: 'Select Item' },
                                                                ...inventoryItems.map(inv => ({ label: inv.itemName || '', value: inv.itemName || '' }))
                                                            ]}
                                                        />`;
        });
        
        if (content.includes('SearchableSelect') && !content.includes('import { SearchableSelect }')) {
             content = content.replace(/(import\s+React[^;]*;)/, "$1\nimport { SearchableSelect } from '../components/shared/SearchableSelect';");
        }

        if (content !== original) {
            fs.writeFileSync(file, content);
            console.log(`Updated ${file}`);
        }
    }
});
