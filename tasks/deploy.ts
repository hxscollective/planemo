// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { omitBy } from 'lodash'
import { performance } from 'perf_hooks'
import { task } from 'hardhat/config'
import logger from '../utils/logger'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-ethers'
import { BigNumber } from 'ethers'

task('deploy', 'Deploy to the network')
  .addOptionalParam('gasPrice', 'Value of the gas price overriding network value in the config')
  .addOptionalParam('nonce', 'Nonce value to override the default from the account')
  .setAction(async (args, hre) => {
    const { ethers } = hre
    const [deployer] = await ethers.getSigners()
    const contractName = 'HxSCollectivePlanemo' // TODO: .env?

    logger.info(`Starting deployment to [${hre.network.name}] network for [${contractName}]`)
    logger.info(`Compiling [${contractName}] ...`)

    await hre.run('compile')

    logger.info(`Contract [${contractName}] compiled`)

    const deployStartTime = performance.now()
    const gasPrice = args.gasPrice ? BigNumber.from(args.gasPrice) : undefined
    const nonce = args.nonce ? BigNumber.from(args.nonce) : undefined

    logger.info(
      `Deploying [${contractName}] with deployer's as [${deployer.address}] and balance of [${ethers.utils.formatEther(
        await deployer.getBalance(),
      )}] ETH ...`,
      {
        gasPrice,
        nonce,
      },
    )

    const Contract = await ethers.getContractFactory(contractName)
    const instance = await Contract.deploy(process.env.COLLECTION_URI!, {
      gasPrice,
      nonce,
    })
    const txHash = instance.deployTransaction.hash

    logger.info(
      `Contract [${contractName}] deployed with address [${instance.address}] after [${Math.round(
        performance.now() - deployStartTime,
      )}] ms`,
      {
        transaction: omitBy(instance.deployTransaction, (_, key) => key === 'data'),
      },
    )

    const miningStartTime = performance.now()

    logger.info(`Waiting for transaction [${txHash}] to be mined and confirmed ...`)

    const receipt = await instance.deployTransaction.wait()

    if (receipt?.confirmations > 0) {
      logger.info(
        `Transaction [${txHash}] confirmed and mined after [${Math.round(performance.now() - miningStartTime)}] ms`,
        { receipt },
      )
    } else {
      logger.error(
        `Transaction [${txHash}] has not been confirmed after [${Math.round(performance.now() - miningStartTime)}] ms`,
        { receipt },
      )
    }

    logger.info(`Deployer's balance after deployment is [${ethers.utils.formatEther(await deployer.getBalance())}] ETH`)
  })
