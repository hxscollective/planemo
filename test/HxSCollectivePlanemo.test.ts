/* eslint-disable camelcase */
/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { HxSCollectivePlanemo, HxSCollectivePlanemo__factory } from '../typechain'

describe('HxSCollectivePlanemo', () => {
  let owner: SignerWithAddress
  let Contract: HxSCollectivePlanemo__factory
  let instance: HxSCollectivePlanemo
  const totalSupply = 21

  beforeEach(async () => {
    ;[owner] = await ethers.getSigners()
    Contract = await ethers.getContractFactory('HxSCollectivePlanemo', owner)
    instance = await Contract.deploy('https://ipfs.io/ipfs/test/')
  })

  it('deploys the contract', async () => {
    expect(instance.deployTransaction.hash).to.not.be.undefined
    expect(instance.deployTransaction.from).to.eql(owner.address)
  })

  it('mints intial supply to the creator of the contract', async () => {
    for (let i = 1; i <= totalSupply; i++) {
      expect(await instance.ownerOf(i)).to.equal(owner.address)
    }
  })

  describe('#totalSupply', async () => {
    it('returns the total supply of the collection', async () => {
      expect(await instance.totalSupply()).to.equal(totalSupply)
    })
  })

  describe('#tokenURI', async () => {
    it('returns the correct URI for the collection', async () => {
      for (let i = 1; i <= totalSupply; i++) {
        expect(await instance.tokenURI(i)).to.equal(`https://ipfs.io/ipfs/test/${i}`)
      }
    })
  })

  describe('#setCollectionURI', async () => {
    describe('as the creator of the contract', async () => {
      it('changes the collection URI', async () => {
        await instance.setCollectionURI('https://ipfs.io/ipfs/new123/')

        for (let i = 1; i <= totalSupply; i++) {
          expect(await instance.tokenURI(i)).to.equal(`https://ipfs.io/ipfs/new123/${i}`)
        }
      })
    })

    describe('as someone else as the creator of the contract', async () => {
      let user: SignerWithAddress

      beforeEach(async () => {
        ;[, user] = await ethers.getSigners()
      })

      it('does not allow changing the collection URI and reverts the transaction', async () => {
        await expect(
          instance.connect(user).setCollectionURI('https://ipfs.io/ipfs/new123/', { from: user.address }),
        ).to.be.revertedWith('Ownable: caller is not the owner')
      })
    })
  })

  describe('#transferFrom', async () => {
    let user: SignerWithAddress

    beforeEach(async () => {
      ;[, user] = await ethers.getSigners()
    })

    describe('as the owner of the token', async () => {
      it('transfers ownership of the token', async () => {
        await instance.transferFrom(owner.address, user.address, 1)

        expect(await instance.ownerOf(1)).to.eql(user.address)

        for (let i = 2; i <= totalSupply; i++) {
          expect(await instance.ownerOf(i)).to.eql(owner.address)
        }
      })
    })

    describe('as someone else as the owner of the token', async () => {
      it('does not transfer ownership of the token and reverts the transaction', async () => {
        const [, , otherUser] = await ethers.getSigners()

        await expect(
          instance.connect(user).transferFrom(user.address, otherUser.address, 1, { from: user.address }),
        ).to.be.revertedWith('ERC721: transfer caller is not owner nor approved')

        for (let i = 1; i <= totalSupply; i++) {
          expect(await instance.ownerOf(i)).to.eql(owner.address)
        }
      })
    })
  })

  describe('#withdraw', async () => {
    let user: SignerWithAddress

    beforeEach(async () => {
      ;[, user] = await ethers.getSigners()

      expect((await ethers.provider.getBalance(instance.address)).toNumber()).to.eql(0)

      await user.sendTransaction({ to: instance.address, value: ethers.utils.parseEther('1') })

      expect(await ethers.provider.getBalance(instance.address)).to.eql(ethers.utils.parseEther('1'))
    })

    describe('as the owner', async () => {
      it('withdraws the balance of the contract to the owner', async () => {
        const ownerBalance = await owner.getBalance()

        await instance.connect(owner).withdraw()

        ownerBalance.add(ethers.utils.parseEther('1'))

        expect((await ethers.provider.getBalance(instance.address)).toNumber()).to.eql(0)
        expect((await owner.getBalance()).gt(ownerBalance)).to.be.true
      })
    })

    describe('as someone else', async () => {
      it('fails to withdraw the balance and reverts', async () => {
        const [, , otherUser] = await ethers.getSigners()

        await expect(instance.connect(otherUser).withdraw({ from: otherUser.address })).to.be.revertedWith(
          'Ownable: caller is not the owner',
        )
      })
    })
  })
})
