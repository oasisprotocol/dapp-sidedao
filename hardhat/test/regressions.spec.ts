import { expect } from "chai";
import { ethers } from "hardhat";
import { AccountCache, HeaderCache, StorageProof, StorageProofACL } from "../src/contracts";
//import { fetchAccountProof, fetchStorageProof, getBlockHeaderRLP, guessStorageSlot, xchainRPC } from "@oasisprotocol/blockvote-contracts";
import { AbiCoder, BytesLike, hexlify, ParamType, randomBytes } from "ethers";
import { fetchAccountProof, fetchStorageProof, xchainRPC } from "@oasisprotocol/blockvote-contracts";

function abiEncode (types: ReadonlyArray<string | ParamType>, values: ReadonlyArray<any>): string {
    const abi = AbiCoder.defaultAbiCoder()
    return abi.encode(types, values)
}

function abiDecode (types: ReadonlyArray<string | ParamType>, values: BytesLike): any {
    const abi = AbiCoder.defaultAbiCoder()
    return abi.decode(types, values)
}

/*
struct PollSettings {
    bytes32 block_hash;
    address account_address;
    uint256 slot;
}

struct PollCreationOptions {
    PollSettings settings;
    bytes headerRlpBytes;
    bytes rlpAccountProof;
}
*/
const STORAGEPROOF_ACL_OPTIONS = ['tuple(tuple(bytes32,address,uint256),bytes,bytes)'];

describe("Regressions", function () {
    let headerCache: HeaderCache;
    let accountCache: AccountCache;
    let storageProof: StorageProof;
    let storageProofACL: StorageProofACL;

    before(async () => {
        const headerCacheFactory = await ethers.getContractFactory('HeaderCache');
        headerCache = await headerCacheFactory.deploy();

        const accountCacheFactory = await ethers.getContractFactory('AccountCache');
        accountCache = await accountCacheFactory.deploy(await headerCache.getAddress());

        const storageProofFactory = await ethers.getContractFactory('StorageProof');
        storageProof = await storageProofFactory.deploy(await accountCache.getAddress());

        const storageProofACLFactory = await ethers.getContractFactory('StorageProofACL');
        storageProofACL = await storageProofACLFactory.deploy(await storageProof.getAddress());
    });

    /// Construct the arguments manually
    it('USDT on Ethereum', async () => {
        const [signer] = await ethers.getSigners();

        const contractAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
        const holderAddress = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
        //const rpc = xchainRPC(1);

        // Retrieve latest block
        //const latestBlock = await rpc.send('eth_getBlockByNumber', ['latest', false]);
        //const blockHash = latestBlock.hash;
        //console.log('Latest block', blockHash);
        const blockHash = '0x458f48cdbe9a752e441016798a5b268c924fc94d7261b5a09fff8c6c3d3f627e';

        // Retrieve info about token & guessed storage slot
        //const tokenInfo = await guessStorageSlot(rpc, tokenAddress, holderAddress);
        //expect(tokenInfo).is.not.null;
        //expect(tokenInfo?.index).eq(2);
        //const slotNumber = tokenInfo?.index!;
        const slotNumber = 2;

        // Retrieve block header for latest block
        //const headerRlpBytes = await getBlockHeaderRLP(rpc, latestBlockHash);
        const headerRlpBytes = '0xf90264a0fdaeff702a4bfbe34c4c2b355fb3190c72e82f73ab2f155328cc29287fd70f9fa01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347944838b106fce9647bdf1e7877bf73ce8b0bad5f97a0546cab50a706eddfb879e8ded499637cfc4e06892d9167656a0135546aae8387a04c725568f6ce9553ab59103696021935159fb433c26a3351dfd4432105d5bba2a0aaaf32e9bef17354dd9865923944368f9cbe7337269a26e03e2aa857188acd0eb901003d239066bd4531dd99201cc89bb8b2f058590138402fb8d70b8542acf03bac8f10173589c2fe146c7ed0494391b7df286771e0768da06323758fee6d4deb63c6fd1c458a8763983b681c41899b77ebaa212b001987f76e9c6236c00d8daec0c47747072a527245fe2ad8ec3194612ed324bd98abc3d98d2bd2a54b3ed03f75630854ece9dfe3aefc185c32e4d6e660ac941282f361a1c589aec4704bf2b0234daa5ccb64f9987800865659e458158c4915a55cca3878518755d22cb247a829b6e7b97c13879afed855a6c122632bbcc7d282af9a9e31243146e35773e1b5b9920cf0e068eb4f4b8c55a4538260321942429fd13145eee8f3249e616944043c078084013dd13f8401c9c38083f7fa778466f42a7f98546974616e2028746974616e6275696c6465722e78797a29a011de738d502ddbf9dd008aaa5a8d3bda7daa7e3917e8b8e5d69a3a0a732d752688000000000000000085077e26ca82a0641d08a16c428723672b3bc5f1e86554d6f90dd4d09fa677993f6b9c05887199830c000083080000a0c9501ab034c7115cd08edcbb8fdad15ad6b64769ecc9ff94a6ab1168336534bf';

        // Retrieve account proof for token within the block
        //const rlpAccountProof = await fetchAccountProof(rpc, latestBlockHash, tokenAddress);
        //console.log('Account proof', rlpAccountProof);
        const rlpAccountProof = '0xf90e74f90211a0c64e3bc52db8dd2f42036b75794dafddb38d2b8b484b81f1a24aab05a935cd82a0ce3ccadc947bce93936609d14942aae1b2fd5ee92ffdd833a198be83eb3cc9e3a06bd3b7510d51c75ec8b3ef8725c28067d470a2451babb38698e51156d2d2413fa07af04c878b57acac060d6f7d3ca443deeedfa77b964825998f22c3b7ba797977a05d8adce9a279e56047653dd5a4ec7aad93908c667a39a780690639b3d60ae558a09ceb9cdb6ba49011dc85db0598ad35c86e5ac0a3f1777dbc57e11ea977db3553a0879021449f93d57f9a1bf62f105d8dcf439e6e96c8aca0eb229827e0723beae1a0849e963b516d5461dec475cf4aaa541cf4f96e664ce6e7a1e49992f550cb9d9da06923729ec75bde23da262cafea6ccc654836eacef4b0683cae84033fc71718a2a09031dbe27f78b05d19be5a4ce444ce7a42ddbc86d46d147a34078a001c09c163a0158164323709398d29db60b5e6250b240f832a4f8166d42d7c555e6e19cd4a10a0a4d659b9e725fd98811b927a38f66c28a83ac779ba578341fef433614375ac38a0cdc01dc4b817eb8e36b17fcc2a93f97ffcbf94d9b93478cd34a1f4b516dc0c57a05aa6b42bd2122cf7d8a8c2fdb885f01b7ceb92f33716c6131b7576f3101fea95a0f6407c6dc3ef669ba4364f32d3084359e9b75eb57eb5d6312f2914d4b4bcf7b2a0e8ba5deceaa65e9b60c83caed9d1ce57755be07bee9555e5c81a58f6fca6c49f80f90211a0e4d5fedfbf8d4a89dd1aaadaac251a080fb070a266670464e933313dd6995dd3a09c07f9fb3e4391d8bfa0313142d4de6a0d72fb9aabf4a3e179a0d58da78bae3aa0246f7c769411595ead330ffbbc3baece2418c5f43430229c1d37946f16270084a0ce41fc477347960bb61ad001e31f313ed5ef6ea16e311afce9cf153ff084acd3a09299c218c89a1876243fae019691d236489b64ce9bcffe696a1cde21af045f70a00bc9949456f708759f3b239deacfdcac343502cfb199057768d55729cb6efdd3a0ccac7c0c2b79bf393b8770a6ac32ae1d7962fe83c43d85331e5cedc082c46c14a03317a5ee8823105bd03da00fa352d54bf6204b96eb88a373aa5ec0389b8bf2dfa0e32ef3065fdb068286c195be324f878bd6062701e1b30af41191f5f1c033cbd6a0ebafc9288159d78b51d35eba70db02925e0274b2ba5ed02bde7781c50374470ca0cde448e1cd0026c2913802e6513b950629b8ad13394c4f6f855039b814d5a505a00de6434402b78fc55d1dc305f2fc86435560fac590089662729c1cc782663187a07a76f71e9423813b9c36193b9de7465d153d93903dd4ea446df7c17ff0272305a09979f89d50c6b4a572d521c41893cbce764192b9a1fc2c39573b24484d42ac56a0790e23835dd7d8fcc763cd359818bef020d8ee20f0376968a545c450c6f75882a03c885376e0ee5d65e3d86ed17fac15bf5767ef7cf42798deaa1453845b986e3b80f90211a084586d990561fe15ca7196f6cecc1fd5a03470269ecb57c7384355a932d0d51fa0dee8650f27c194a4242a9bc2ae57860b34f5241ab4f898480237e64ccb4a34cea09d4e6045df0fecb562cc7f272efac0d390c45f3177dfa54b8d4d2f936cf9c343a0e0dc0820839c433a855d081de2769c213e5e0c36eb7ea61dc4d4c9b68e15f021a01e701aeba0ffa16e9b9ad38a4635deaa9d5b2ea15d51451a0ddde17cff46b0f2a014da72e41c6465c89d33f33d915e33354a941b1a7dfb3910080cc59d5eccd990a0e3dfdda4bebb07f895255b3d2de1bcbdc5c8a0b3bc4f06166301e94167c1a441a0912722f60a765f5237cb5b2813fc3d3d8ad7c0029f0ceba52364eac49c8742b2a0771f4493671d11706007ee4c3922b3a9b88d5cc6d7b9da01bd9a1356cadf6e75a0ec8116bf5107ed1a4617c70b6919524e7704d9b8efd8fe56e047271dcb2e9913a021754771be11e8b04e07b92cea857919b82fd6d929bc8abbaf4973937dfc6c07a0813050ab2ac39ce48511c7f8b6f2c15a55dcc1e02fc747fd217a4b65a46dd849a0c7dabc2f8c188252688ed104e284337e8b28d4dd322272834dcba3d2266a1bb3a0a74c9bd76dd1b576ef0d59660ecb8769dc9b9ed4dd5a579730b0eaf9539dd2d7a0ddf1b43f2a56de5e91cd3813f3683f1eb46fb07bb43e20e37bfa93d55b90770ba0be6a63a155b7cfb87909f9b4858b734cc2e198131ac49254d886a4e309c2362280f90211a01f9787f92bf84348afb516aad2db60dcf6b6a2610cfd1cc8f5deeb4de405e630a0a20479b9fe7138e33924a1a7051ce6881d768c0fc6b0c1ef83e9110cdfe2944da010cce0a650859b3001eed87f69da6185803f3249599e39db9bef4ea688744fada0de6ddd93b05c01ffad0a8bcb58592bc46f420e8473029665036526ee2ab1cecba0cc0b687c4ab71893caf48bd93327d54caab06414c8e5785042d20561b4dd510da03da11a21476de054927f564f4dc032d561bdc8a072af2093feca87b9e5db8801a055ce8fb15b6c39c784982c9e5945ff0770a1826b1c236bbc3ef630616cfff143a03428dee6ad7bad8bcfd8583dc657e1fdadaaeef0458277ea77e03f412572f730a018f8ea649edf39fe76d6f9ee8d549f4b04288b601ffc7fa3af4f32523185c36ea06c87f8c6538153bfadd520283aff71f8bc5309020da427a1dabd17b09523cec5a08e8c6979f6ed0660b28f7dfe9ae5d3a6990dcdf776f16f851d5a55500673d910a0c4991f0a3ca36c35602a00b63d8ec3e40e7c9970f885daea66ee746880f68effa0dce30625b8725d2609de76c93c561f9fb107a651ed40fe7fa1d2c1a47fdec49aa08d7ce933127e7616919c8c21c64d31f51890971894e710978334d12a86463070a07e33739c2f463bee8e6acce482400bf92a471f9efd493e65191a5f1511f63dbfa084d6222c26d1a678a4743ddc5a7c340cda60115d81027ea1f84fde96628b269680f90211a0d999bc20244e0d3f130e9ffb0d117681b7e949e0f29fab130fcb8a595a24e5cba03a7eeb4cd5b10797f841a05689e1254849eee7e354ac955aba33fb8b8a0fe034a044d6eff950da57b8dc791973316b7de60583603ca6be90d1fdfe68d1963b6e64a0c7c0043d6cf1f9f27d4e79836674cbd0f52009928c4724b834c00f6bf0195cb1a0aab52c180fb0446f083d23883c8b583c60ac84b7aef30ec4754680616d4aee08a066a45bf3ae1d6371ec0360bce1f381cf5e5a0ec394806d7255b4fb5e6c3e7158a057e5f3846fa590f59469549c0b49ebf7c7bf459be44df500ff3a95334f46d1f3a05d6bdfaa37df5d0e738bdc9d34db27bf211c7194e5b538ddf2110d5d7b9b3581a0ca4034c20b668da92322c7e5954383e22dda61f6e4f0d08db8a0e63073c98ff0a05045c70c68b31879e175bf18469967f745fc6ab45237ed6a861e28c196e05b89a054c986cc59f94901040b4241f553de9b598d6f3ffb36ae364ffce69c8812a194a0d175b08eb41fdaaa481535af5c10c80306db998a9e5e71d820048f8c25a04792a0d9182f6d81bb6982debbadbd20b463b4f3592b08fe8e4e4ead280fc7a9efff21a0f80044cf0484991bab30a7deab60815dd8391a3fd4f290798f15a19dd871a1aea0271aee067a52e22a397bdd7b63be08d4c765923ae2d96a825023c2abc14459afa004066d98f171f8cbc35bcfe7b0f881d3d87d40c1880ab56e1cb207692598e8ff80f90211a0b1f4cf3fad378d9bb7670237a0ca8c148ba4f121ec49ec7e12519eaf625402b9a0d22ec30f696a02f0387d8de043069e3ce7cdfcc2fecdbfb0ed22828e302f47e1a067f9200eef6cd28b708d6292b57e2a42b577874e5b1cbd406741e61a483e6b7aa04dd7486d8411c15afeb6f5cec5b2381cf1d758fdceda1508b65f18f1879a6e75a0dc27682e270b349a5a0d66f89641f1deb1ce2a97bed8eb948d1eac172ca5fcb1a09f667630192531ec82594d2c88903154c001dd21484fe387227f5707a01bbe45a0d3773088d4d3dbb3608bba7148fddc5fdc2f0e43f9b0a9b18bcd46fecb30fd32a0fa2d58fa72a0def55d433448082afaf15cd22241176a962ce19b84d5d89cbc70a0a60e1315be595edd2f36b0c8070638278ebfc3d1b02d9ad4828a690564f98c8ea0e4e3830e486521cc62bc05be33fb82dc976be5f77031cb9cff945c6fd9c07f6ba0459c6e8b574d64274fb16551693a6e71ba2489ed094172f5784dc1bbcb53a3a5a01af29c4ae492c1ef17d49e759c535e83a0f10e5be08e9218ad50a9a18a058604a096d3e05bb50ee4b1cec89a4eefea21fc8939fa5d1d698dddee320266d3245853a0ad45735c19f6fdd0d89dbbaa7aae4599b0e3fb099ae36b48410fb55231a1facca07f7ce774d7b7577b55855a3e43488251dee87580c24113156b1bf9bcd6d7d9aba002da6787e8307cb84094c8487ed9050b7fb0f85dfab55b22eeb6a7561694020380f90191a00a7a0118e00981ab321049c9d340cd52c3a4781037540f7c48d0fdc27e899b3280a08537f2e248702a6ae2a57e9110a5740f5772c876389739ac90debd6a0692713ea00b3a26a05b5494fb3ff6f0b3897688a5581066b20b07ebab9252d169d928717fa0a9a54d84976d134d6dba06a65064c7f3a964a75947d452db6f6bb4b6c47b43aaa01e2a1ed3d1572b872bbf09ee44d2ed737da31f01de3c0f4b4e1f046740066461a04fc418834820b25555b7cf8be5503658e30bb499883f7aa550c7f8cf073c9839a07da2bce701255847cf5169ba5a7578a9700133f7ce13fa26a1d4097c20d1e0fda04f0981dd1cc7bdc61cf594422f4217ee3681f97cd573bdf029971c801d17a352a0c8d71dd13d2806e2865a5c2cfa447f626471bf0b66182a8fd07230434e1cad2680a0e9864fdfaf3693b2602f56cd938ccd494b8634b1f91800ef02203a3609ca4c21a0c69d174ad6b6e58b0bd05914352839ec60915cd066dd2bee2a48016139687f21a0513dd5514fd6bad56871711441d38de2821cc6913cb192416b0385f025650731808080f8669d3802a763f7db875346d03fbf86f137de55814b191c069e721f47474733b846f8440101a0cb83a5234333008eca9c50b83af4d01fb1f212c6b6719c9d09cce7c2c6d8ab1ea0b44fb4e949d0f78f87f79ee46428f23a2a5713ce6fc6e0beb3dda78c2ac1ea55';

        // Create our proposal
        const proposalId = hexlify(randomBytes(32));
        const proposalOptions = abiEncode(
            STORAGEPROOF_ACL_OPTIONS,
            [[[blockHash, contractAddress, slotNumber], headerRlpBytes, rlpAccountProof]],
        );
        await storageProofACL.onPollCreated(proposalId, hexlify(randomBytes(20)), proposalOptions);

        // Retrieve proof of users balance
        //const userBalanceProof = await fetchStorageProof(rpc, blockHash, contractAddress, slotNumber, holderAddress);
        //console.log('userBalanceProof', userBalanceProof);
        const userBalanceProof = '0xf90c13f90211a07ddc76cd0b4d836f65d410964ade0ba9ead66511eaf100a0c148b12664a0a670a0488eac4fccc6d9ac02bb97cc961a6c8218e821393c8d8ab2f12ef989f1338894a00003fcbcad56ac1840784ee1176c23bf714bb272f660ca34c09019b45ce27517a05c7321388ae61c79fe64f92eb608a4b4f1182342850b29498c027debe000d723a0f697dc2bc5e03c4951d6f8611010a23481a3b6b4e5ba55f2120ef6635b23cf67a0de1ccfc1a10a1e95c67de698d78dec21f962c9b36cd27082f4d028cd7bef436fa0ea4e535812ffd677ee2b1263b33d0a8f914dda067be6dc49a10dc0f96df8fb10a07377809d3b8e4919e7046fa64d6d533040012b7642dc4af0c3812d53a2611597a0d65530ea04b927613ab6026f0520968c7d8cdbf4b53296a2a3de75a6b6d8fde8a08f2cb124fea12d410ed677119a714f71408fee4da1c8e0cca620a892cf6f14bba08bce36028c9406e2c514053f57c6c4f30e73a5405de1b82f8807daca21de021ea02f4c45557332a3a0c7c1a4ff448c0e03778e93262b576d522093fbfb679bb5dda0a4a2990656fc45b5c76733fa374438c5977a4e6ea2c1e8862070cd32b2183b74a0283e915dba03fbcfc0d45684e1233ac7f8444434d88f94896dbd52480b0e11f1a0cf64e1c31040e440ca2f1c92700c7e122ca43690c7a9c1f46ccffc6b4d207b5ca08fad0b4e1a29fc15057cc247a9a373d7541c5c65cc51e5d2aa4a965d6414f6ff80f90211a05da032b8cc7572b80deaac31723df7d9abc80cb632203d8b309b322d587cffcba0c7493fe43cd8d319b919d0d2e4f901b9fc672bc5f273445da1f7990727ca7520a02fca60af7f00f6f79ff652694c555290f8e297483925dfa83374aa1d8c00493aa0b7bf8810111e8c2f5f3876eb89ee544b63cba03f46140b36bb4730360af31ceea0bfabde003fa495cc6d4cb78a8474f90300d9c549616f3924a5fc89da9168f34fa05a0b0c7d8e7d3e46b2fe58502868e5f7fb01be2a90414821c3af2ac2167b5cb3a0ee4e24b65ea2dfe33872c2e902b6385e211ec3d09aeae6c4fd51570493201c85a0cc2c4b90ed605668a6e50042eff97fb9a4982cd46fbc4b8b7cd911a28ce09423a0514856165fe529092ce98251a680a3d4a778a2d06da00d6bd5cbea67217a4649a097845d13edaf5868d1fb0b4f81e08e82ec0f5ed6baec4d1c7ca4e12b7343f17ba081ab8c2bc2b3b2ceb6aa2825657240a89c3f8185157c6dc769f551a0b8c1cf98a05282d4e73a8ea8c14507f0039a2f9592c30383e2722d2d8f1ce8602d66fffb23a0c2c2699bdc622375c4cab97e719fd7eebf8607b081b755036620d347df6074f5a02acf945fb709921639df84bc17a269b0686a55e3f3c6df51410eabd0ac7561aaa0e41856ea4412c87139aaa08a406489ee484df2a45be41faad905ace1852dd824a0c505e3f346e117520e34bc2049c580fe32ed0afadefde42ce536d1dc800c35a380f90211a0275364ec5190da2f2f288c20d13bbb7bcef1d416b16bf64e138fca14547de78ea0eae53e46eafce3815f8d6f54e22e064c86ec5e75f57f0a54968be2ea7290166ba077e5f03aa056d76ac7ec56edc8a2c075008c50ddcf4e86c137ad6e07e95ad2bca0256d6593f05cb156cdf19d898c0ac997dd3e7432183a466680529b58d9dc287aa0acdfb4e265ef41ea7b8e5de1275667349c8486c50ab8e5c69cb88643c914b3a4a07525b567077c8837b571403b5f4004c8646446a14682fabdd492fe4808c93d4aa086a984673d41f5e6ca67f60a5473ae84fcc9957c89b1ceef61a6419df0a369a6a0fbd06241576874f3dd3b24fb330273b2aa1a6ee8a969017a6130d5155bb493e1a0ca128774443ae28b853a12defb7d0298a616d44dcaf5fd21a4e67a9e47fb10d7a065978d2efc48d0e0aa5092a95975f3dbcb556325b406d08a22692ac5ed34b422a0396c287ec053168b0b2c50d77b1eafee4b7a415594f6e4176023a77139273059a0bf087c6e2f682ff11b0afd5c283e7ee77c779e0cc378fffe625edc38b2a1c4a0a0c3596b358963ffa8b0c4772f401bf0a766fa68a7cad1ba368bc4522aa2b89745a0366089e3eeeff4bf3aeac2655586e9a79a087908a406b178e9268f88bdc838bfa017a744d0b48a96e0c6cc3031b08136b963941d2cf60d22b9624d6b3a8142b4c6a01dea7cd4f0624544c7737bacc74c92fbf531f71b775d581b12946d08302f69e880f90211a026c414ee1a29d2319f84756c6871fa4e35e4c2fa2214c1db7d2ee5e6a64493a7a011c2203d9bdae4c3a2bdea189b28decc0eac705ff518b343550abb2eef5d07f7a064003a1408d1782208397419ceb78101a6271637656fe3690712eab6e971aa2ba0f1895fedecefcd04efa73bd7a5198cd51746dafead1e5cab282f07e156de9fd6a075af19b4a45ebeba88856a18321159fbd30ed8f8305eb104cbe228ae9c5c9e0ca096bee805cb35a993886ce123948628e45dafb40acdaf2017e86201027685b679a04b25479cf7bbb7f5c43bb08c8525b82bde1c37551b7df8208476ab207c5bd82ba0e69a3a89765f44796bb26e87096eda513f589067b1289476a72e77e2ddb42ef7a0324ee812186fb5b4c3022010d224a44331ef2551a70ce253eed15b490adb24dfa0be86f162e3b284f66a6b6b4475b70b7e4ba076565e3df4fcfbb579ed6d8446b7a016f534810e44490f42343b9062162a4cfeedc88dfdc98ef6b0e7c9cb8ec82339a00c9c1ad8a72f9798fe50816f065f64902719a532ed169eea73eed11fe2b99920a069989dc5accd7966e5cea137dfe6a5a87c1ffb2e5c08d3a0ca940dde0b47c6d1a00c17fe699b1161ad14094b769bd6379813c63678e04fc63c7c1e276d3152ae3ea03ffd083edd5d390346a045c0d0314640bf16154d6f48de4de0eea9bbd8f2965ba0e9b7766fb431d7bab124c5301b99e990bac74498392c1bdc8e9b51606c3bb92080f90211a0925ef2864ee71e7df0638eb6f3341662a5a5d034156067f1e1d91768ffa9377aa04e57c80e1488c6628c36fb1ebba0790c032b8690601fb328d4c641d2b1e3e7f8a0b499518981ab253de6aaaabfead30f52b8fbf5fce6c5aee0ba2cfda54f3de0a3a0c96b0135d6ef603e771c39a9111a1a15ecd4f503bd6ffac37a9c5ef42604572fa084cb7a25c5debe492e427bb737a00a018531ebdaf220c1bda032a608504a3b13a0b3de1a378ade6a70383f7fbc6db70c4fd1da6e49c3639336d5e17f71fc425373a0a0f7c2a38848dd3fd427efab48a1d93ffa7212fc2169147c494dac4b9b5147eda0ccc05f66803b5e2a35167d54dacf8126126a4fefb9b991b6513a95db410faea2a0f575ad5e6ebb724f703f25c1fd3a29a19b6a5e7c30a75f1c18a019a7394c8e32a08851c1e437331f32aecab826cc404e501479541a6c303658a41f6188bd58e868a04942fb03614d896439914e1c8539751c8d445da8cb4975884546486944361041a0c10565ccbeb4249baa5ce96769e3e64266cbe3df2b8d0161b217acb9d805d95ca0293c75ffec74d2189723e76ebd31154307406000f0677b63a2e686242235942ca02912701ecdfe47514f1efd81d9feadfaf120fbbe909cb4339ffbfa618c27d316a087bceff3961ee9aea62a544e9b06323fb8f62f608306b864d1b8bddac2831a4ea0f3e9758dd75ba6453f44017db81b8e155078578f6a851644332489b3013b6d7480f90131a01d4a8ee3af146a91366409c1e2c59b4569ac872f76ad4677c8337a1f3e12201180a065f2bab38d4a0e3118597b6b0067191de9afaa4d2935ec7c1cfcd81db4cc5dc5a06a3033feafa55390de625a84ea4996976286239146b4a6392242ff8ef8b3e9d4a019df7efb0770b0b07403c6a0b64364a6bd164c0dea5a12547754589fb764b7e280a0d624be59151c7fec940628a0a819ec7055c4894ea6af0e0b8a0302bfe50a02cca0f4e2577d9f1df04697fee1442b264c26dcd9b9b51f607cce167b0266187b15f38080a0a40c701e3a3c2d88f6c26a39e058e0a37ba67cb6db22f078b1b9abecf0b795e4a08259e9dab6f6b0c72cfb9153e9aed7ecca1e26afc519de71877d7e14aadee7f2808080a0512206a36824e4c0cef92e11a6071846ad68e8b12f042c23f16243e56bf0df9a80f851808080808080808080a0315e225878d124ad74a228bdc9f82e0e8b0963a0b8d391eb54b484baad536acf808080a04c359d1368b5658945c6996b413287cf33c71f9c3b164788c74e6603ee6c4cbe808080e79d362366783a4fc90e52c8cc595ba9fd2b278bc52248117c14c07e5394d888871baab171df8cc9';

        // Finally verify the storage proof ACL returns the correct balance (voting weight)
        const voteWeight = await storageProofACL.canVoteOnPoll(await signer.getAddress(), proposalId, holderAddress, userBalanceProof);
        expect(String(voteWeight)).eq('7787503467597001');
    });
});
