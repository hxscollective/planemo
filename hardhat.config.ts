import * as dotenv from 'dotenv'

import { extendEnvironment, HardhatUserConfig } from 'hardhat/config'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-web3'
import '@typechain/hardhat'
import 'hardhat-gas-reporter'
import 'solidity-coverage'
import logger from './utils/logger'

dotenv.config()

const {
  APP_NAME,
  TESTING_ALCHEMY_API_URL,
  TESTING_ACCOUNT_PRIVATE_KEY,
  PRODUCTION_ACCOUNT_PRIVATE_KEY,
  PRODUCTION_ALCHEMY_API_URL,
} = process.env

// Import tasks
require('./tasks')

// Config
const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 21,
      },
    },
  },
  defaultNetwork: 'hardhat',
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545',
      mining: {
        auto: false,
        interval: 5000,
      },
    },
    rinkeby: {
      url: TESTING_ALCHEMY_API_URL,
      accounts: [`0x${TESTING_ACCOUNT_PRIVATE_KEY}`],
    },
    mainnet: {
      url: PRODUCTION_ALCHEMY_API_URL,
      accounts: [`0x${PRODUCTION_ACCOUNT_PRIVATE_KEY}`],
      gasPrice: 10 * 1000000000,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
    gasPrice: 10,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
}

extendEnvironment(hre => {
  logger.setSettings({ name: `${APP_NAME} network:${hre.network.name}` })
})

export default config
