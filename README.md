# CO2-Storage

![CO2.Storage](/co2.storage.png)

<p align="center">
  <a href="https://twitter.com/filecoingreen">
    <img
      alt="Twitter: Filecoin Green"
      src="https://img.shields.io/twitter/follow/filecoingreen.svg?style=social"
      target="_blank"
    />
  </a>
</p>

### About

The Filecoin Green team is developing CO2.Storage in recognition that industry practitioners would benefit from a upload utility for environmental assets based on standardized data schemas.

This recognition stemmed from conversations with various stakeholders in the traditional and web3 carbon markets space. This project is the continuation of the idea posted in the Filecoin Green Tools repo: <a href="https://github.com/protocol/FilecoinGreen-tools/blob/main/0006-FGTP-CO2_Storage.md"><b><u>0006-FGTP-CO2_Storage</u></b></a>.

This data upload utility maps inputs to base data schemas (<a href="https://ipld.io/"><u>IPLD</u></a> DAGs) for off-chain data (like metadata, images, attestation documents, and other assets) to promote the development of standard data schemas for environmental assets.

With IPLD DAGs, data is <a href="https://nftschool.dev/concepts/content-addressing"><u>content addressed</u></a> using IPFS, meaning the URI pointing to a piece of data (“ipfs://…”) is completely unique to that data (using a content identifier, or CID). CIDs can be used for environmental assets and metadata to ensure the asset forever actually refers to the intended data (eliminating things like double counting, and making it trustlessly verifiable what content an asset is associated with). These standard, content addressed, data schemas will also enable more seamless cross-referencing for missing data and meta-analysis of different assets/credits, as well as help expedite the development of new forms of methodologies, supply, and marketplaces.

This project should be considered <a href="https://en.wikipedia.org/wiki/Software_release_life_cycle#Pre-alpha"><u>pre-alpha</u></a>, and we are actively seeking input from industry participants and interested parties. We encourage everyone to reach out to our team if this topic is of interest to you: <a href="mailto: green@filecoin.org"><b><u>green@filecoin.org</u></b></a>

### License
Licensed under the MIT license.
http://www.opensource.org/licenses/mit-license.php
