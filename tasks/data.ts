import { task } from 'hardhat/config'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-ethers'
import logger from '../utils/logger'
import * as glob from 'glob'
import { NFTStorage, File, Blob } from 'nft.storage'
import mime from 'mime'
import { promises as fs } from 'fs'
import fspath from 'path'
import * as DataTypes from '../types/data.types'
import { sortBy, takeRight } from 'lodash'

task('upload-to-nft-storage', 'Upload metadata to IPFS NFT.storage')
  .addParam('path', 'Path to the files')
  .addParam('image', 'Name of the image file for each NFT', 'image.jpg')
  .setAction(async ({ path, image }: { path: string; image: string }, hre) => {
    const time = performance.now()

    logger.info(`Uploading [${path}] directory to NFT.storage ...`)

    const paths = sortBy(glob.sync(`${path}/*`), path => Number(fspath.basename(path)))
    const nftstorage = new NFTStorage({ token: process.env.NFT_STORAGE_API_KEY! })

    for (const path of paths) {
      const metadataPath = `${path}/metadata.json`
      const imagePath = `${path}/${image}`

      const metadata = require(fspath.resolve(metadataPath)) as DataTypes.Metadata

      if (metadata.image) {
        logger.info(`Skipping [${metadata.name}] NFT from [${path}] to NFT.storage, since it is already uploaded`)
      } else {
        const content = await fs.readFile(imagePath)
        const type = mime.getType(fspath.resolve(imagePath))!
        const blob = new Blob([content], { type })

        const { name } = metadata
        const cid = await nftstorage.storeBlob(blob)

        metadata.image = `https://ipfs.io/ipfs/${cid}`

        await fs.writeFile(metadataPath, JSON.stringify(metadata))

        logger.info(`Uploaded [${name}] NFT from [${path}] to NFT.storage and updated metadata`, {
          name,
          cid,
          metadata,
        })
      }
    }

    logger.info(`Uploading all metadata.json files from [${path}] to NFT.storage ...`)

    const metadataFiles = []
    const metadataPaths = glob.sync(`${path}/**/metadata.json`)

    for (const metadataPath of metadataPaths) {
      const fileName = takeRight(metadataPath.split('/'), 2)[0] // Take tokenId as fileName

      metadataFiles.push(
        new File([await fs.readFile(metadataPath)], fileName, {
          type: 'application/json',
        }),
      )
    }

    const cid = await nftstorage.storeDirectory(metadataFiles)

    logger.info(
      `Uploaded [${metadataFiles.length}] metadata files to NFT.storage with [${cid}] CID in [${Math.round(
        performance.now() - time,
      )}] ms`,
      {
        cid,
      },
    )
  })
