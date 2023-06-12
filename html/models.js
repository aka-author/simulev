const GR_ALTRUIST = "altruist";
const GR_EGOIST = "egoist";


function onlyNonNegative(a) {
    return a > 0 ? a : 0;
}


class Model extends Worker {

    constructor(chief, workerTypeName="model") {
       super(chief, workerTypeName); 
       this.simulationTaskProps = null;
    }

    setSimulationTaskProps(simulationProps) {
        this.simulationTaskProps = simulationProps;
        return this;
    }

    getSimulationTaskProps() {
        return this.getProp("simulationTaskProps");
    }

    getChildModelIds() {
        return this.getWorkerIds();
    }

    startOpenSimulaion(transact) {}

    finishOpenSimulaion(transact) {}

    openSimulation(transact) {

        this.startOpenSimulaion(transact);

        for(let childModelId of this.getChildModelIds())
            this.getWorkerById(childModelId).openSimulation(transact);
        
        this.finishOpenSimulaion(transact);

        return this;
    }

    startSimulateCycle(transact) {}

    finishSimulateCycle(transact) {}

    simulateCycle(transact) {

        this.startSimulateCycle(transact);

        for(let childModelId of this.getChildModelIds())
            this.getWorkerById(childModelId).simulateCycle(transact);

        this.finishSimulateCycle(transact);

        return this;
    }

    startCloseSimulaion(transact) {}

    finishCloseSimulaion(transact) {}

    closeSimulation(transact) {

        this.startCloseSimulaion(transact);

        for(let childModelId of this.getChildModelIds())
            this.getWorkerById(childModelId).closeSimulation(transact);
        
        this.finishCloseSimulaion(transact);

        return this;
    }

}


class Mushroom extends Model {

    constructor(chief, workerTypeName="mushroom") {

        super(chief, workerTypeName);

        this.aliveFlag = true;
        this.age = 0;

        this.setPosition(0, 0);

        this.drinkAmount = 1;
        this.healthLevel = 1;
        this.pregancyLevel = Math.random();

        let stp = chief.getSimulationTaskProps();

        this.setSelfishnessGroup(Math.random() < stp.altruistsInitialShare ? 
            GR_ALTRUIST : GR_EGOIST);

        if(this.isAltruist()) {
            this.timeShare = stp.altruisticTimeShare;
            this.interestShare = stp.altruisticInterestShare;
            this.glucoseLevel = stp.altruistGlucoseValue;
            this.glucoseUsage1 = stp.altruisticGlucoseUsage1;
            this.glucoseUsage10 = stp.altruisticGlucoseUsage10;
            this.glucoseUsage100 = stp.altruisticGlucoseUsage100;
        } else {
            this.timeShare = stp.egoisticTimeShare;
            this.interestShare = stp.egoisticInterestShare;
            this.glucoseLevel = stp.egoistGlucoseValue;
            this.glucoseUsage1 = stp.egoisticGlucoseUsage1;
            this.glucoseUsage10 = stp.egoisticGlucoseUsage10;
            this.glucoseUsage100 = stp.egoisticGlucoseUsage100;
        }
    }

    getWater() {
        return this.getChief();
    }

    setAliveFlag(flag=true) {
        this.aliveFlag = flag;
        return this;
    }

    isAlive() {
        return this.aliveFlag;
    }

    isDead() {
        return !this.isAlive();
    }

    incAge() {
        this.age++;
        return this;
    }

    getAge() {
        return this.age;
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }

    getDrinkAmount() {
        return this.drinkAmount;
    }

    getHealthLevel() {
        return this.healthLevel;
    }

    resetPregancyLevel() {
        this.pregancyLevel = 0;
        return this;
    }

    incPregancyLevel(increment) {
        this.pregancyLevel += increment;
        return this;
    }

    getPregancyLevel() {
        return this.pregancyLevel;
    }

    setSelfishnessGroup(groupName) {

        this.selfishnessGroupName = groupName;

        return this;
    }

    getSelfishnessGroupName() {
        return this.selfishnessGroupName;
    }

    getSelfishnessLevel() {
        return this.selfishnessLevel;
    }

    isAltruist() {
        return this.selfishnessGroupName == GR_ALTRUIST;
    }

    isEgoist() {
        return this.selfishnessGroupName == GR_EGOIST;
    }

    getGlucoseUnit() {
        return this.getDrinkAmount()*this.getWater().getGlucoseMaxSolubility();
    }

    isReadyToBorn() {
        return this.getPregancyLevel()/this.getGlucoseUnit() >= this.glucoseLevel;
    }

    bornMushroom() {
        let mushroom = new Mushroom(this.getWater()).setSelfishnessGroup(this.getSelfishnessGroupName());
        this.getWater().addMushroom(mushroom, this.getX(), this.getY());
        this.resetPregancyLevel();
        return this;
    }

    tremble() {

        if(Math.random() < 0.2) {
            let newX = this.getX() + Math.random()*2 - 1;
            let newY = this.getY() + Math.random()*2 - 1; 
            this.setPosition(newX, newY);
        }

        return this;
    }

    produceGlucose(drink) {

        let sa = drink.getSucroseAmount();
        
        let ga = sa/2;
        let ga_interest = ga*this.interestShare;
        let ga_output = sa - ga_interest;
        
        let fa = sa/2;
        
        drink.delSucrose(sa).addGlucose(ga_output).addFructose(fa);
        this.incPregancyLevel(ga_interest);
    }

    produceDescendant(drink) {

        let ga = drink.getGlucoseAmount();

        let bound1 = drink.glucoseSaturation2Amount(0.01);
        let bound10 = drink.glucoseSaturation2Amount(0.1);

        //console.log(bound1, bound10);
        //console.log("gu ", this.glucoseUsage1);
        //console.log("ga, bound1, gu1 ", ga, bound1, this.glucoseUsage1);
        let amount1 = Math.min(ga, bound1)*this.glucoseUsage1;
        let amount10 = onlyNonNegative((Math.min(ga, bound10) - amount1))*this.glucoseUsage10;
        let amount100 = onlyNonNegative(ga - amount1 - amount10)*this.glucoseUsage10;

        //console.log(amount1, amount10, amount100);
        
        let ga_useful = amount1 + amount10 + amount100;   

        drink.delGlucose(ga_useful);

        this.incPregancyLevel(ga_useful);
    }

    doAsAltruist(drink) {

        Math.random() < this.timeShare ? 
            this.produceGlucose(drink) :
            this.produceDescendant(drink);
    }

    doAsEgoist(drink) {
        
        Math.random() < this.timeShare ? 
            this.produceGlucose(drink) :
            this.produceDescendant(drink);
    }

    simulateMetabolicCycle() {

        let water = this.getWater();
        
        let drink = water.emit(this.getDrinkAmount());

        this.getSelfishnessGroupName() == GR_ALTRUIST ? 
            this.doAsAltruist(drink) : this.doAsEgoist(drink);

        water.take(drink);

        return this;
    }

    startSimulateCycle(transact) {
        this.simulateMetabolicCycle();
    }

    finishSimulateCycle(transact) {
        if(this.isReadyToBorn()) this.bornMushroom();
        this.tremble();
        this.incAge();
    } 

} 


class Water extends Model {

    constructor(chief, workerTypeName="water") {

        super(chief, workerTypeName);

        this.waterAmount = 0;
        this.sucroseAmount = 0;
        this.glucoseAmount = 0;
        this.fructoseAmount = 0;

        this.altruists = [];
        this.altruistsBorn = 0;
        this.egoists = [];
        this.egoistsBorn = 0;
    }

    getFlask() {
        return this.getChief();
    }

    getWidth() {
        return this.getFlask().getWidth();
    }

    getHeight() {
        return this.getFlask().getHeight();
    }

    concentration(substanceAmount, waterAmount) {
        return waterAmount > 0 ? substanceAmount/waterAmount : 0;
    }

    addWater(amount) {
        this.waterAmount += amount;
        return this;
    }

    delWater(amount) {
        this.waterAmount -= amount;
        return this;
    }

    getWaterAmount() {
        return this.waterAmount;
    }

    addSucrose(amount) {
        this.sucroseAmount += amount;
        return this;
    }

    delSucrose(amount) {
        this.sucroseAmount -= amount;
        return this;
    }

    getSucroseAmount() {
        return this.sucroseAmount;
    }

    getSucroseConcentration() {
        return this.concentration(this.getSucroseAmount(), this.getWaterAmount());
    }

    getSucroseMaxSolubility() {
        return 2.00; 
    }

    getSucroseSaturation() {
        return this.getSucroseConcentration()/2.00;
    }

    addGlucose(amount) {
        this.glucoseAmount += amount;
        return this;
    }

    delGlucose(amount) {
        this.glucoseAmount -= amount;
        return this;
    }

    getGlucoseAmount() {
        return this.glucoseAmount;
    }

    getGlucoseConcentration() {
        return this.concentration(this.getGlucoseAmount(), this.getWaterAmount());
    }

    getGlucoseMaxSolubility() {
        return 0.909; // https://en.wikipedia.org/wiki/Glucose
    }

    getMaxGlucoseAmount() {
        return this.getWaterAmount()*this.getGlucoseMaxSolubility(); 
    }

    glucoseSaturation2Amount(saturation) {
        return this.getMaxGlucoseAmount()*saturation;
    }

    getGlucoseSaturation() {
        return this.getGlucoseConcentration()/this.getGlucoseMaxSolubility();
    }

    addFructose(amount) {
        this.fructoseAmount += amount;
        return this;
    }

    delFructose(amount) {
        this.fructoseAmount -= amount;
        return this;
    }

    getFructoseAmount() {
        return this.fructoseAmount;
    }

    getFructoseConcentration() {
        return this.concentration(this.getFructoseAmount(), this.getWaterAmount());
    }

    getFructoseMaxSolubility() {
        return 0.909; 
    }
    
    getFructoseSaturation() {
        return this.getFructoseConcentration()/this.getFructoseMaxSolubility();
    }

    take(water) {

        this.addWater(water.getWaterAmount())
            .addSucrose(water.getSucroseAmount())
            .addGlucose(water.getGlucoseAmount())
            .addFructose(water.getFructoseAmount());

        return this;
    }

    emit(amount) {

        let sa = amount*this.getSucroseConcentration();
        let ga = amount*this.getGlucoseConcentration();
        let fa = amount*this.getFructoseConcentration();

        this.delWater(amount).delSucrose(sa).delGlucose(ga).delFructose(fa);

        return new Water().addWater(amount).addSucrose(sa).addGlucose(ga).addFructose(fa);
    }

    countMushrooms() {
        return this.countWorkers();
    }

    getMushroomsWeight() {
        return this.getAltruistsWeight() + this.getEgoistsWeight();
    }

    addMushroom(mushroom, mx=null, my=null) {

        let flask = this.getFlask();
        let x = !!mx ? mx + Math.random()*2 - 1 : Math.random()*flask.getWidth()*.95;
        let y = !!my ? my + Math.random()*2 - 1 : Math.random()*flask.getHeight()*.95;
        mushroom.setPosition(x, y);

        this.addWorker(mushroom);

        if(mushroom.isAltruist()) {
            this.altruists.push(mushroom) 
            this.altruistsBorn++;
        } else {
            this.egoists.push(mushroom);
            this.egoistsBorn++;
        }

        return this;
    }

    distill() {
        this.sucroseAmount = 0;
        this.glucoseAmount = 0;
        this.fructoseAmount = 0;
        return this;
    }

    removeAllMushrooms() {
        this.removeAllWorkers();
        this.altruists = [];
        this.egoists = [];
        return this;
    }

    pourOut() {
        this.removeAllMushrooms();
        this.distill();
        this.waterAmount = 0;
        return this;
    }

    countAltruists() {
        return this.altruists.length;
    }

    getAltruistsWeight() {
        return this.countAltruists()*this.getSimulationTaskProps().altruistGlucoseValue;
    }

    getAltruistsShare() {
        return this.getAltruistsWeight()/this.getMushroomsWeight();
    }

    countAltruistsBorn() {
        return this.altruistsBorn;
    }

    countEgoists() {
        return this.egoists.length;
    }

    getEgoistsWeight() {
        return this.countEgoists()*this.getSimulationTaskProps().egoistGlucoseValue;
    }

    getEgoistsShare() {
        return this.getEgoistsWeight()/this.getMushroomsWeight();
    }

    countEgoistsBorn() {
        return this.egoistsBorn;
    }

    startSimulateCycle() {
        this.altruistsBorn = 0;
        this.egoistsBorn = 0;
    }
 }


class Flask extends Model {
        
    constructor(chief, workerTypeName="flask") {

        super(chief, workerTypeName);

        this.width = 600;
        this.height = 600;

        this.water = new Water(this);
        this.addWorker(this.water);

        this.report = [];
    }

    setSize(width, height) {

        this.width = width;
        this.height = height;

        return this;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getWater() {
        return this.water;
    }

    getSimulationTaskProps() {
        return GLOBAL_CONTROL_PANEL.getSimulationTaskProps();
    }

    populate() {

        let water = this.getWater();

        let stp = this.getSimulationTaskProps();
        water.addSucrose(stp.surcoseInitialConcentration*water.getSucroseMaxSolubility()*water.getWaterAmount());

        let n_mushrooms = stp.visibleCellsNumber;
        for(let i = 0; i < n_mushrooms; i++) 
            water.addMushroom(new Mushroom(water));
    }

    startOpenSimulaion(transact) {
        this.getWater().pourOut().addWater(500000);
        this.populate();
        this.step = 0;
        this.report = [];
    }

    getStepNumber() {
        return this.step;
    }

    finishSimulateCycle() {

        let reportRow = {};

        let water = this.getWater();
        
        reportRow.step = ++this.step;

        reportRow.sucroseSaturation = water.getSucroseSaturation();
        reportRow.glucoseSaturation = water.getGlucoseSaturation();
        reportRow.fructoseSaturation = water.getFructoseSaturation();
        reportRow.countAltruists = water.countAltruists();
        reportRow.altruistsWeight = water.getAltruistsWeight();
        reportRow.countEgoists = water.countEgoists();
        reportRow.egoistsWeight = water.getEgoistsWeight();
        reportRow.countCells = water.countMushrooms()
        reportRow.cellsWeight = water.getMushroomsWeight();
        reportRow.altruistsShare = water.getAltruistsShare();
        reportRow.altruistsBorn = water.countAltruistsBorn();
        reportRow.egoistsShare = water.getEgoistsShare();
        reportRow.egoistsBorn = water.countEgoistsBorn();

        if(this.report.length > 0) {
            reportRow.totalColonyGrowth = reportRow.cellsWeight/this.report[0].cellsWeight;
            reportRow.avarageGrowthRate = reportRow.totalColonyGrowth/reportRow.step;
        }

        this.report.push(reportRow);

    }

    getFinalStep() {
        return this.report[this.report.length - 1].step;
    }

    getColonyTotalGrowth(step=undefined) {

        let actualStep = step || this.getFinalStep();
        let firstStep = this.report[0].step;
        let lastIndex = actualStep - firstStep;
        let initialCellsWeight = this.report[0].cellsWeight;
        let finalCellsWeight = this.report[lastIndex].cellsWeight;

        let colonyTotalGrowth = lastIndex > 0 ? (finalCellsWeight - initialCellsWeight)/initialCellsWeight : 0;

        return colonyTotalGrowth;
    }

    getColonyAvarageGrowthRate(step=undefined) {
        let actualStep = step || this.getFinalStep();
        return this.getColonyTotalGrowth(actualStep)/actualStep;
    }

    getAggregatedRow(from, to) {

        let ra = {
            "sucroseSaturation": 0,
            "glucoseSaturation": 0,
            "fructoseSaturation": 0,
            "altruistsShare": 0,
            "altruistsBorn": 0,
            "egoistsShare": 0,
            "egoistsBorn": 0, 
            "colonyGrowthRate": 0,
            "totalColonyGrowth": 0,
            "avarageGrowthRate": 0
        };

        ra.step = this.report[to - 1].step;

        for(let r = from; r < to; r++) {
            ra.sucroseSaturation += this.report[r].sucroseSaturation; 
            ra.glucoseSaturation += this.report[r].glucoseSaturation;
            ra.fructoseSaturation += this.report[r].fructoseSaturation;
            ra.altruistsShare += this.report[r].altruistsShare;
            ra.altruistsBorn += this.report[r].altruistsBorn;
            ra.egoistsShare += this.report[r].egoistsShare;
            ra.egoistsBorn += this.report[r].egoistsBorn;
        }

        let n = to - from;
        let last_index = to - 1;
        ra.sucroseSaturation /= n; 
        ra.glucoseSaturation /= n;
        ra.fructoseSaturation /= n;
        ra.altruistsShare /= n;
        ra.egoistsShare /= n;
        ra.colonyGrowthRate = ((this.report[last_index].cellsWeight - this.report[from].cellsWeight)/this.report[from].cellsWeight)/n;
        ra.totalColonyGrowth = this.report[last_index].cellsWeight/this.report[0].cellsWeight;
        ra.avarageGrowthRate = ra.totalColonyGrowth/last_index;

        return ra;
    }

    getAggregatedReport(nRows) {

        let aggregatedReport = [];
        let step = Math.floor(this.report.length/nRows);

        for(let r = 0; r < step*nRows; r += step) 
            aggregatedReport.push(this.getAggregatedRow(r, r + step));
        
        return aggregatedReport;
    }

    replaceEnglishDecimalWithLocal(s) {
        return s.replace(/\./g, this.getSimulationTaskProps().reportDecimalPoint);
    }

    assembleTsvRow(fields) {
        return fields.join("\t");
    }

    assembleTsvHeadings(headings, dataRows=undefined) {
        return !!headings ? this.assembleTsvRow(headings) + "\n" : "";
    }

    assembleTsvTable(dataRows, headings=undefined) {

        let tsvRows = [];
        for(let row of dataRows)
            tsvRows.push(this.replaceEnglishDecimalWithLocal(this.assembleTsvRow(row)));

        let tsvHeadings = this.assembleTsvHeadings(headings, dataRows);

        return tsvHeadings + tsvRows.join("\n");
    }

    getTsvMeasurements() {

        let stp = this.getSimulationTaskProps();

        let nRows = stp.reportRowsNumber;
        let report = this.getAggregatedReport(nRows > 0 ? nRows : this.report.length)

        let outputRows = [];
        for(let row of report)
            outputRows.push([
                row.step,
                row.sucroseSaturation, row.glucoseSaturation, row.fructoseSaturation,
                row.altruistsShare, row.egoistsShare,
                row.colonyGrowthRate, row.totalColonyGrowth, row.avarageGrowthRate]);
        
        let outputHeadings = [
            "step",
            "sucroseSaturation", "glucoseSaturation", "fructoseSaturation",
            "altruistsShare", "egoistsShare", 
            "colonyGrowthRate", "totalColonyGrowth", "avarageGrowthRate"];

        return this.assembleTsvTable(outputRows, stp.includeHeadings ? outputHeadings : undefined);
    }

    getTsvTotals() {

        let stp = this.getSimulationTaskProps();

        let outputRow = [
            stp.surcoseInitialConcentration, stp.altruistsInitialShare,
        
            stp.altruisticTimeShare, stp.altruisticInterestShare, stp.altruistGlucoseValue,
            stp.altruisticGlucoseUsage1, stp.altruisticGlucoseUsage10, stp.altruisticGlucoseUsage100,
        
            stp.egoisticTimeShare, stp.egoisticInterestShare, stp.egoistGlucoseValue,
            stp.egoisticGlucoseUsage1, stp.egoisticGlucoseUsage10, stp.egoisticGlucoseUsage100,

            this.getFinalStep(), this.getColonyTotalGrowth(), this.getColonyAvarageGrowthRate()
        ];

        let outputHeadings = [
            "sucroseInitialSaturation", "altruistInitialShare",
        
            "altruistTimeSahreForProducingGlucose", "altruistGlucoseShareConsumedAtOnce", "altruistWeight",
            "altruistGlucoseConsumption1", "altruistGlucoseConsumption10", "altruistGlucoseConsumption100",
        
            "egoistTimeSahreForProducingGlucose", "egoistGlucoseShareConsumedAtOnce", "egoistWeight",
            "egoistGlucoseConsumption1", "egoistGlucoseConsumption10", "egoistGlucoseConsumption100",

            "totalTime", "colonyTotalGrowth", "colonyAvarageGrowthRate"
        ];

        return this.assembleTsvTable([outputRow], stp.includeHeadings ? outputHeadings : undefined);
    }
}
