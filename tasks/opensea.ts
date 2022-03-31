import { OpenSeaPort, Network } from 'opensea-js'
import { map, sortBy } from 'lodash'
import { performance } from 'perf_hooks'
import { task } from 'hardhat/config'
import logger from '../utils/logger'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-ethers'
import * as glob from 'glob'
import fspath from 'path'
import HDWalletProvider from '@truffle/hdwallet-provider'

task('bulk-sell-on-opensea', 'Bulk-setup sale for the NFTs')
  .addParam('days', 'Number of days for the sale', '7')
  .addParam('contract', 'Address of the contact')
  .addParam('path', 'Path to the NFT files')
  .setAction(async ({ days, contract, path }, hre) => {
    logger.info(`Creating bulk sale for NFTs on OpenSea on [${hre.network.name}] network ...`, { contract, days })

    let provider: HDWalletProvider
    const { ethers } = hre
    const [account] = await ethers.getSigners()

    if (hre.network.name === 'mainnet') {
      provider = new HDWalletProvider({
        privateKeys: [process.env.PRODUCTION_ACCOUNT_PRIVATE_KEY!],
        providerOrUrl: process.env.PRODUCTION_ALCHEMY_API_URL!,
      })
    } else {
      provider = new HDWalletProvider({
        privateKeys: [process.env.TESTING_ACCOUNT_PRIVATE_KEY!],
        providerOrUrl: process.env.TESTING_ALCHEMY_API_URL!,
      })
    }

    const seaport = new OpenSeaPort(provider, {
      networkName: hre.network.name === 'mainnet' ? Network.Main : Network.Rinkeby,
      apiKey: '',
    })

    // WETH Contract Addresses
    const WETHContractAddresses: { [key: string]: string } = {
      rinkeby: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
      mainnet: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    }

    const tokens = sortBy(
      map(glob.sync(`${path}/*`), path => fspath.basename(path)),
      token => Number(token),
    )

    const order = {
      accountAddress: account.address,
      startAmount: 0.01,
      expirationTime: Math.round(Date.now() / 1000 + 3600 * 24 * Number(days)),
      paymentTokenAddress: WETHContractAddresses[hre.network.name],
      waitForHighestBid: true,
    }

    logger.info(`Creating sell orders for [${tokens.length}] tokens ...`, { order, tokens })

    for (const tokenId of tokens) {
      const startTime = performance.now()

      try {
        await seaport.createSellOrder({
          ...order,
          asset: {
            tokenAddress: contract,
            tokenId,
          },
        })

        logger.info(`Created sell order for [${tokenId}] token in [${Math.round(performance.now() - startTime)}] ms`)
      } catch (err) {
        logger.error(`Error creating sell order for [${tokenId}] token`, { err })
      }
    }
  })
