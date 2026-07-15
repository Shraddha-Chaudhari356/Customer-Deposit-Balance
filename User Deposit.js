/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/log'], function (search, log) {

    // DEPOSIT DATA
    function getDepositData(customerId) {  //(It collects deposit data per currency)

        var depositData = {}; //This will store final data

        var depositSearch = search.create({
            type: "transaction",
            filters: [
                    ["entity", "anyof", customerId], "AND",
                    [
                    ["type", "anyof", "CustDep"], "OR",    
                    ["type", "anyof", "DepAppl"]], "AND",
                    ["mainline", "is", "T"]
            ],
            columns: ["currency", 
                       "type",
                    "fxamount"] //(foreign currency) //fetching data
        });

        depositSearch.run().each(function (result) { // process one by one

            var currency = result.getText("currency") || "UNKNOWN";
            var type = result.getValue("type");
            var amount = parseFloat(result.getValue("fxamount")) || 0;

            log.debug('currency', currency);
            log.debug('type', type);
            log.debug('amount', amount);

            if (!depositData[currency]) {  //Data stored for a specific currency
                depositData[currency] = {
                    totalDeposit: 0,
                    totalUsed: 0,
                    remaining: 0
                };
            }

            if (type === "CustDep") {
                depositData[currency].totalDeposit += amount;  //If money is received → increase deposit
            }

            if (type === "DepAppl") {  //If deposit is applied, add it to used amount
                depositData[currency].totalUsed += Math.abs(amount); 
            }

            return true;
        });

        // Calculate remaining deposit
        for (var cur in depositData) {
            depositData[cur].remaining =
                (depositData[cur].totalDeposit - depositData[cur].totalUsed);
        }

        return depositData;
    }

   
    //BEFORE LOAD
    function beforeLoad(context) {
        try {

            if (
                context.type !== context.UserEventType.VIEW &&
                context.type !== context.UserEventType.PRINT
            ) {
                return;
            }

            var customerId = context.newRecord.id;  //Gets the current customer record ID
            if (!customerId) return;

            // Get both data
            var depositData = getDepositData(customerId);
           
            // Convert to JSON
            var json = JSON.stringify(depositData || {});
            log.debug('FINAL JSON', json);

            // Add field for PDF
            var field = context.form.addField({
                id: 'custpage_deposit_json_view',
                type: 'longtext',
                label: 'Deposit JSON'
            });

            field.defaultValue = json;  //Put JSON data into field

            field.updateDisplayType({
                displayType: 'inline'
            });

        } catch (e) {
            log.error('ERROR', e);
        }
    }

    return {
        beforeLoad: beforeLoad
    };

});