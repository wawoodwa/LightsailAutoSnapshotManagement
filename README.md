# LightsailAutoSnapshotManagement
This is a simple Lambda to create and delete snapshots of all instances and relational databases within a single Lightsail region.

# Why?
Amazon had a great little SAM application (https://github.com/amazon-archives/lightsail-auto-snapshots) that would deploy a Python 2.7 Lambda that would automatically snapshot the instances in a Lightsail environment in a defined region.  It would keep the snapshots in place for a defined number of days, then it would age out the oldest snapshots. I used this extensively for our service offering. That application has since been archived by Amazon, presumably due to adding snapshot features for some instances.

As the code has not been maintained, and was using a deprecated 
