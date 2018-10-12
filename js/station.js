const Web3 = require("web3");
// const DataFrame = require("dataframe-js").DataFrame;
const DataFrame = require("data-forge").DataFrame;
const prettyMs = require("pretty-ms");

const web3 = new Web3("wss://mainnet.infura.io/_ws");
// const web3 = new Web3(Web3.givenProvider || "http://localhost:8645");

let station;
let mined_block_num;
let maxBlocks = 1000;
let alltx = new DataFrame();
let bdata = new DataFrame();
let predictiondata = new DataFrame();
let blocktime = 3;

class Timers {
    constructor(start_block) {
        this.start_block = start_block;
        this.current_block = start_block;
        this.process_block = start_block;
    }

    updateTime(block) {
        this.current_block = block;
        this.process_block = this.process_block + 1;
    }
}

class CleanTx {
    constructor(tx_obj) {
        this.hash = tx_obj.hash;
        this.block_mined = tx_obj.blockNumber;
        this.gas_price = tx_obj.gasPrice;
        this.roundGp10gwei();
    }

    toDataFrame() {
        return {
            hash: [this.hash],
            block_mined: [this.block_mined],
            gas_price: [this.gas_price],
            gp_gwei: [this.gp_gwei],
        };
    }

    roundGp10gwei() {
        //rounds the gas price to gwei
        let gp = this.gas_price / 1e9;
        // if (gp >= 1 and gp < 10)
        // gp =
        this.gp_gwei = gp;
    }
}

class CleanBlock {
    constructor(block_obj, time_mined, min_gas_price = 0) {
        this.block_number = block_obj.number;
        this.time_mined = time_mined;
        this.block_hash = block_obj.hash;
        this.min_gas_price = min_gas_price;
    }

    toDataFrame() {
        return {
            block_number: [this.block_number],
            time_mined: [this.time_mined],
            block_hash: [this.block_hash],
            min_gas_price: [this.min_gas_price],
        };
    }
}

const processBlockTransactions = async block => {
    // """get tx data from block"""
    let block_object = await web3.eth.getBlock(block, true);
    if (!block_object) return null;
    let time_mined = block_object.timestamp;
    let transactions = [];
    for (let tx of block_object.transactions) {
        let clean_tx = new CleanTx(tx);
        transactions.push(clean_tx.toDataFrame());
    }
    let block_df = new DataFrame(transactions);
    // block_df.show();
    // console.log(block_df.toString());
    return [block_df, block_object];
};

const processBlockData = async (block_df, block_obj) => {
    // """process block to dataframe"""
    let block_min_gas_price = 0;
    if (block_obj.transactions.length > 0) {
        block_min_gas_price = block_df.deflate(row => row.gp_gwei).min();
    }

    let time_mined = block_df.deflate(row => row.time_mined).min();
    let clean_block = new CleanBlock(
        block_obj,
        time_mined,
        block_min_gas_price,
    );
    let clean_df = new DataFrame([clean_block.toDataFrame()]);
    // console.log(clean_df.toString());
    return clean_df;
};

const getHpa = (gasprice, hashpower) => {
    // """gets the hash power accpeting the gas price over last 200 blocks"""
    let hpa = hashpower.loc;
};

const analyzeLast200Blocks = (block_number, blockdata) => {
    recent_blocks = bdata.where(
        row => row.block_number > block_number - maxBlocks,
    );
    let hashpower = recent_blocks.reorderSeries([
        "min_gas_price",
        "block_number",
    ]);
    // console.log(hashpower.toString());

    let hpwr = hashpower
        .groupBy(row => row.min_gas_price)
        .select(group => ({
            count: group.deflate(row => row.min_gas_price).count(),
            min_gas_price: group.first().min_gas_price,
        }))
        .inflate()
        .orderBy(row => row.min_gas_price * 100);
    let h = hpwr.generateSeries({
        cum_blocks: row =>
            hpwr
                .where(r => r.min_gas_price * 100 <= row.min_gas_price * 100)
                .getSeries("count")
                .sum(),
    });
    let totalBlocks = h.getSeries("count").sum();
    hpwr = h.generateSeries({
        hasp_pct: row => row.cum_blocks / totalBlocks,
    });
    // let blockInterval = recent_blocks.orderBy("block_number")
    // log(hpwr);
    // TODO: calculate average, hardcoded for now
    let avg_time_mined = 3;
    return [hpwr, avg_time_mined];
};

const log = v => {
    return console.log(v.toString());
};

const agg = () => {
    recent_blocks = bdata.where(
        row => row.block_number > mined_block_num - maxBlocks,
    );
    let hashpower = recent_blocks.reorderSeries([
        "min_gas_price",
        "block_number",
    ]);
    return hashpower;
};

const makePredictionTable = (block, alltx, hashpower, avg_time_mined) => {};

class GasStation {
    constructor(block) {
        this.alltx = [];
        this.blockdata;
    }
}

const status = () => {
    return bdata.count();
};

const percentHash = gwei => {
    let closestgwei = -1;
    let maxgwei = 1000;
    predictiondata.getSeries("min_gas_price").forEach(x => {
        if (Math.abs(gwei - x) < maxgwei) {
            maxgwei = Math.abs(gwei - x);
            closestgwei = x[0];
        }
    });
    // console.log(closestgwei);
    let pct_hashpower = predictiondata
        .where(r => r.min_gas_price == closestgwei)
        .deflate(r => r.hasp_pct)
        .sum();
    // console.log(pct_hashpower);

    // let estimate = (maxBlocks - maxBlocks * pct_hashpower) * blocktime * 1000; // estimate in minutes
    //every block you have a pct_hashpower chance to be picked up, how many seconds until certain
    // let estimate = 1 / pct_hashpower * blocktime * maxBlocks;
    return pct_hashpower; //{ ms: estimate, pretty: prettyMs(estimate, { verbose: true }) };
};

const predictDuration = gwei => {
    let totalblocks = bdata.count() < maxBlocks ? bdata.count() : maxBlocks;
    let closestgwei = -1;
    let maxgwei = 1000;
    predictiondata.getSeries("min_gas_price").forEach(x => {
        if (Math.abs(gwei - x) < maxgwei) {
            maxgwei = Math.abs(gwei - x);
            closestgwei = x[0];
        }
    });
    // console.log(closestgwei);
    let pct_hashpower = predictiondata
        .where(r => r.min_gas_price == closestgwei)
        .deflate(r => r.hasp_pct)
        .sum();
    // console.log(pct_hashpower);

    // let estimate = (maxBlocks - maxBlocks * pct_hashpower) * blocktime * 1000; // estimate in minutes
    //every block you have a pct_hashpower chance to be picked up, how many seconds until certain
    let estimate =
        (totalblocks - pct_hashpower * totalblocks) * blocktime * 1000;
    return { ms: estimate, pretty: prettyMs(estimate, { verbose: true }) };
};
//2804000
// prettyMs(percentHash(2)*3*bdata.count())
// (bdata.count() - percentHash(5) * bdata.count()) * 3

const loadblocks = async () => {
    let blocknum = mined_block_num;
    while (
        blocknum > mined_block_num - maxBlocks &&
        bdata.count() <= maxBlocks
    ) {
        [block_df, block_obj] = await processBlockTransactions(blocknum);

        if (!block_obj) {
            console.warning("No block data");
            return;
        }

        let clean_block = await processBlockData(block_df, block_obj);
        if (clean_block) {
            // console.log(blocknum);
            bdata = bdata.concat([clean_block]);
        }
        blocknum--;
    }
};

const subscribe = () => {
    let subscription = web3.eth
        .subscribe("newBlockHeaders", function(error, result) {
            // if (!error) {
            //     console.log(result);
            //     return;
            // }
            // console.error(error);
        })
        .on("data", async function(blockHeader) {
            mined_block_num = blockHeader.number - 3;
            if (!station) station = new GasStation(blockHeader);

            if (bdata.count() < 200) {
                loadblocks();
            }

            // console.log(blockHeader);
            // console.log(mined_block_num);

            [block_df, block_obj] = await processBlockTransactions(
                mined_block_num,
            );

            // alltx.concat([block_df]);

            if (!block_obj) {
                console.warning("No block data");
                return;
            }

            let clean_block = await processBlockData(block_df, block_obj);

            //add block data to block dataframe
            if (clean_block) {
                // console.log(mined_block_num);
                bdata = bdata.concat([clean_block]);

                [hashpower, block_time] = analyzeLast200Blocks(
                    mined_block_num,
                    bdata,
                );
                // log(hashpower);
                predictiondata = hashpower;
                blocktime = block_time;
            }
        });
};

subscribe();
// .on("error", console.error);

module.exports.predictDuration = predictDuration;
module.exports.bdata = status;
