const http = require('http');

const BASE_URL = 'http://localhost:3005';

function request(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const reqOptions = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        };

        const req = http.request(url, reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let json;
                try {
                    json = JSON.parse(data);
                } catch (e) {
                    json = data;
                }
                resolve({ status: res.statusCode, data: json });
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('=== STARTING P1 COMPREHENSIVE E2E VERIFICATION ===\n');
    let passCount = 0;
    let failCount = 0;

    function assert(desc, condition) {
        if (condition) {
            console.log(`✅ PASS: ${desc}`);
            passCount++;
        } else {
            console.error(`❌ FAIL: ${desc}`);
            failCount++;
        }
    }

    try {
        // 1. Chart of Accounts & Suspense check
        console.log('--- TEST 1: Chart of Accounts & Suspense Check ---');
        const coaRes = await request('/api/accounts');
        assert('Chart of Accounts endpoint responds 200', coaRes.status === 200);
        const accounts = coaRes.data;
        const suspenseAcc = accounts.find(a => a.name === 'Suspense' || a.code === '9999');
        console.log(`Total accounts: ${accounts.length}, Suspense found: ${!!suspenseAcc}`);
        assert('VAT Output liability account exists', accounts.some(a => a.name.includes('VAT Output') || a.code === '2110'));
        assert('Cost of Goods Sold account exists', accounts.some(a => a.name.includes('Cost of Sales') || a.name.includes('Cost of Goods') || a.code === '5000'));
        assert('Inventory on hand account exists', accounts.some(a => a.name.includes('Inventory on hand') || a.code === '1300'));

        // 2. Next Reference endpoints
        console.log('\n--- TEST 2: Reference Generator ---');
        const jeRefRes = await request('/api/reference/next/journal-entry');
        const jeRef = jeRefRes.data?.nextRef;
        assert('Journal Entry reference generated (e.g. JE-xxxx)', jeRefRes.status === 200 && jeRef?.startsWith('JE-'));
        console.log('Generated JE Ref:', jeRef);

        const cnRefRes = await request('/api/reference/next/credit-note');
        const cnRef = cnRefRes.data?.nextRef;
        assert('Credit Note reference generated (e.g. CN-xxxx)', cnRefRes.status === 200 && cnRef?.startsWith('CN-'));
        console.log('Generated CN Ref:', cnRef);

        // 3. Stock Creation
        console.log('\n--- TEST 3: Inventory Item Creation ---');
        const testItemCode = 'P1-ITEM-' + Date.now().toString().slice(-4);
        const itemRes = await request('/api/items', {
            method: 'POST',
            body: {
                itemCode: testItemCode,
                itemName: `P1 Test Item ${testItemCode}`,
                unitOfMeasure: 'pcs',
                qtyOnHand: 0,
                averageCost: 0,
                sellingPrice: 150,
                purchasePrice: 100
            }
        });
        assert('Inventory item created successfully', itemRes.status === 200 || itemRes.status === 201);
        const itemId = itemRes.data?.id;

        // 4. Customer Creation
        const custRes = await request('/api/customers', {
            method: 'POST',
            body: {
                name: `P1 Test Customer ${Date.now().toString().slice(-4)}`,
                currency: 'ZMW'
            }
        });
        assert('Test Customer created', (custRes.status === 200 || custRes.status === 201) && custRes.data?.id);
        const customer = custRes.data;

        // 5. Supplier Creation (USD Foreign Currency)
        const suppRes = await request('/api/suppliers', {
            method: 'POST',
            body: {
                name: `P1 Test Global Supplier ${Date.now().toString().slice(-4)}`,
                currency: 'USD'
            }
        });
        assert('USD Test Supplier created', (suppRes.status === 200 || suppRes.status === 201) && suppRes.data?.id);
        const supplier = suppRes.data;

        // 6. Purchase Invoice with Stock & Foreign Currency
        console.log('\n--- TEST 4: Purchase Invoice with Stock & Foreign FX ---');
        const piRef = 'PI-TEST-' + Date.now().toString().slice(-4);
        const piRes = await request('/api/purchase-invoices', {
            method: 'POST',
            body: {
                reference: piRef,
                supplierId: supplier.id,
                supplierName: supplier.name,
                issueDate: new Date().toISOString().slice(0, 10),
                currency: 'USD',
                exchangeRate: 20.0, // 1 USD = 20 ZMW
                grandTotal: 50.0,
                items: [
                    {
                        itemId: itemId,
                        description: '10 units of P1 item',
                        qty: 10,
                        unitPrice: 5.0, // 5 USD per unit = 100 ZMW per unit
                        taxCode: 'No tax',
                        totalAmount: 50.0 // 50 USD total = 1000 ZMW
                    }
                ]
            }
        });
        assert('Purchase Invoice created successfully', (piRes.status === 200 || piRes.status === 201) && piRes.data?.id);
        const purchaseInvoice = piRes.data;

        // Check stock updated after PI
        const updatedItemRes = await request(`/api/items/${itemId}`);
        const qtyAfterPurchase = Number(updatedItemRes.data?.qtyOnHand ?? 0);
        const avgCostAfterPurchase = Number(updatedItemRes.data?.averageCost ?? 0);
        console.log(`Stock after purchase: qty=${qtyAfterPurchase}, avgCost=${avgCostAfterPurchase} ZMW`);
        assert('Purchase Invoice incremented item qtyOnHand by 10', qtyAfterPurchase === 10);
        assert('Purchase Invoice calculated averageCost in base ZMW (100 ZMW)', avgCostAfterPurchase === 100);

        // 7. Sales Invoice with Stock & VAT Output
        console.log('\n--- TEST 5: Sales Invoice with Stock decrement & VAT Output (2110) ---');
        const siRef = 'SI-TEST-' + Date.now().toString().slice(-4);
        // Net: 3 units * 150 ZMW = 450 ZMW. VAT 16% = 72 ZMW. Total = 522 ZMW.
        const siRes = await request('/api/invoices', {
            method: 'POST',
            body: {
                reference: siRef,
                customerId: customer.id,
                customerName: customer.name,
                issueDate: new Date().toISOString().slice(0, 10),
                currency: 'ZMW',
                exchangeRate: 1.0,
                grandTotal: 522.0,
                taxAmount: 72.0,
                balanceDue: 522.0,
                items: [
                    {
                        itemId: itemId,
                        description: '3 units sold',
                        qty: 3,
                        unitPrice: 150.0,
                        taxCode: 'VAT 16%',
                        totalAmount: 522.0
                    }
                ]
            }
        });
        assert('Sales Invoice created successfully', (siRes.status === 200 || siRes.status === 201) && siRes.data?.id);
        const salesInvoice = siRes.data;

        // Check stock after sale
        const itemAfterSaleRes = await request(`/api/items/${itemId}`);
        const qtyAfterSale = Number(itemAfterSaleRes.data?.qtyOnHand ?? 0);
        console.log(`Stock after sale: qty=${qtyAfterSale}`);
        assert('Sales Invoice decremented item qtyOnHand to 7 (10 - 3)', qtyAfterSale === 7);

        // 8. Credit Note linked to Sales Invoice
        console.log('\n--- TEST 6: Credit Note linked to Sales Invoice ---');
        const testCnRef = 'CN-TEST-' + Date.now().toString().slice(-4);
        const cnCreateRes = await request('/api/credit-notes', {
            method: 'POST',
            body: {
                reference: testCnRef,
                customerId: customer.id,
                customerName: customer.name,
                salesInvoiceId: salesInvoice.id,
                salesInvoiceRef: siRef,
                issueDate: new Date().toISOString().slice(0, 10),
                currency: 'ZMW',
                amount: 100.0, // Credit 100 ZMW
                grandTotal: 100.0,
                reason: 'Price adjustment'
            }
        });
        assert('Credit note created successfully', (cnCreateRes.status === 200 || cnCreateRes.status === 201) && cnCreateRes.data?.id);

        // Verify sales invoice balanceDue decreased by 100
        const updatedSiRes = await request(`/api/invoices/${salesInvoice.id}`);
        const newBalanceDue = Number(updatedSiRes.data?.balanceDue ?? 0);
        console.log(`Sales invoice balance due: was 522, now: ${newBalanceDue}`);
        assert('Sales invoice balanceDue reduced from 522 to 422', Math.abs(newBalanceDue - 422.0) < 0.01);

        // 9. Multi-Currency Journal Entry
        console.log('\n--- TEST 7: Multi-line Balanced Journal Entry ---');
        const jeRes = await request('/api/journal-entries', {
            method: 'POST',
            body: {
                reference: 'JE-TEST-' + Date.now().toString().slice(-4),
                date: new Date().toISOString().slice(0, 10),
                description: 'Office Supplies adjustment',
                currency: 'ZMW',
                exchangeRate: 1.0,
                lines: [
                    {
                        accountId: accounts.find(a => a.code === '5100' || a.name.includes('Office'))?.id || accounts[0].id,
                        description: 'Supplies expense',
                        debit: 250.0,
                        credit: 0.0
                    },
                    {
                        accountId: accounts.find(a => a.code === '1200' || a.name.includes('Receivable'))?.id || accounts[1].id,
                        description: 'Offset line',
                        debit: 0.0,
                        credit: 250.0
                    }
                ]
            }
        });
        assert('Balanced Journal Entry created and posted (201)', jeRes.status === 201 || jeRes.status === 200);

        // Unbalanced Journal Entry test
        const badJeRes = await request('/api/journal-entries', {
            method: 'POST',
            body: {
                reference: 'JE-BAD-' + Date.now().toString().slice(-4),
                date: new Date().toISOString().slice(0, 10),
                description: 'Unbalanced entry',
                lines: [
                    {
                        accountId: accounts[0].id,
                        debit: 500.0,
                        credit: 0.0
                    },
                    {
                        accountId: accounts[1].id,
                        debit: 0.0,
                        credit: 100.0
                    }
                ]
            }
        });
        assert('Unbalanced Journal Entry correctly rejected (400)', badJeRes.status === 400);

        // 10. Inter-Account Transfer (Multi-Currency)
        console.log('\n--- TEST 8: Multi-Currency Inter-Account Transfer ---');
        const banksRes = await request('/api/bank-accounts');
        const zmwBank = banksRes.data?.find(b => (b.name && b.name.includes('ZMW')) || (b.currency || 'ZMW') === 'ZMW');
        const usdBank = banksRes.data?.find(b => (b.name && b.name.includes('USD')) || b.currency === 'USD');

        if (zmwBank && usdBank) {
            console.log(`Transfer from: ${zmwBank.name} (${zmwBank.currency || 'ZMW'}) to: ${usdBank.name} (${usdBank.currency || 'USD'})`);
            const xferRes = await request('/api/inter-account-transfers', {
                method: 'POST',
                body: {
                    reference: 'TR-TEST-' + Date.now().toString().slice(-4),
                    date: new Date().toISOString().slice(0, 10),
                    paidFromAccount: zmwBank.id,
                    receivedInAccount: usdBank.id,
                    paidAmount: 20000.0,
                    paidCurrency: 'ZMW',
                    receivedAmount: 1000.0,
                    receivedCurrency: 'USD',
                    description: 'Fund USD operations'
                }
            });
            assert('Multi-currency transfer created successfully', (xferRes.status === 200 || xferRes.status === 201) && xferRes.data?.id);
        } else {
            console.log('Skipping transfer test: need both ZMW and USD bank accounts');
        }

        // 11. Balance Sheet Parity & Suspense Account
        console.log('\n--- TEST 9: Financial Summary & Suspense Account ---');
        const refreshedAccounts = (await request('/api/accounts')).data || [];
        const assetsTotal = refreshedAccounts.filter(a => a.accountType === 'Asset').reduce((s, a) => s + (Number(a.balance) || 0), 0);
        const liabilitiesTotal = refreshedAccounts.filter(a => a.accountType === 'Liability').reduce((s, a) => s + (Number(a.balance) || 0), 0);
        const equityTotal = refreshedAccounts.filter(a => a.accountType === 'Equity').reduce((s, a) => s + (Number(a.balance) || 0), 0);
        const incomeTotal = refreshedAccounts.filter(a => a.accountType === 'Income' || a.accountType === 'Revenue').reduce((s, a) => s + (Number(a.balance) || 0), 0);
        const expenseTotal = refreshedAccounts.filter(a => a.accountType === 'Expense').reduce((s, a) => s + (Number(a.balance) || 0), 0);
        const netProfit = incomeTotal - expenseTotal;
        const totalEquity = equityTotal + netProfit;
        const netAssets = assetsTotal - liabilitiesTotal;
        const parityDiff = Math.abs(netAssets - totalEquity);

        console.log(`Assets: ${assetsTotal.toFixed(2)}, Liabilities: ${liabilitiesTotal.toFixed(2)}, Net Assets: ${netAssets.toFixed(2)}`);
        console.log(`Equity: ${equityTotal.toFixed(2)}, Net Profit: ${netProfit.toFixed(2)}, Total Equity: ${totalEquity.toFixed(2)}`);
        console.log(`Parity Difference (|Net Assets - Total Equity|): ${parityDiff.toFixed(2)}`);

        assert('Balance Sheet Parity holds (Assets - Liabilities = Total Equity)', parityDiff < 0.05);

        const currentSuspense = refreshedAccounts.find(a => a.name === 'Suspense' || a.code === '9999');
        const suspenseBal = Number(currentSuspense?.balance || 0);
        console.log(`Suspense Account balance: ${suspenseBal}`);
        assert('Suspense Account balance is 0.00', Math.abs(suspenseBal) < 0.01);

        console.log(`\n========================================`);
        console.log(`ALL TESTS FINISHED: ${passCount} PASSED, ${failCount} FAILED`);
        console.log(`========================================`);

        if (failCount === 0) {
            process.exit(0);
        } else {
            process.exit(1);
        }

    } catch (err) {
        console.error('Test execution error:', err);
        process.exit(1);
    }
}

runTests();
