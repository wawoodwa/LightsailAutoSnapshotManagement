# LightsailAutoSnapshotManagement
This is a simple Lambda to create and delete snapshots of all instances and relational databases within a single Lightsail region.

# Why?
Amazon had a great little SAM application (https://github.com/amazon-archives/lightsail-auto-snapshots) that would deploy a Python 2.7 Lambda that would automatically snapshot the instances in a Lightsail environment in a defined region.  It would keep the snapshots in place for a defined number of days, then it would age out the oldest snapshots. I used this extensively for our services. That application has since been archived by Amazon, presumably due to adding snapshot features for some instances natively.

As the code has not been maintained, and was using a deprecated runtime (Python 2.7), I decided to rewrite the functionality in the Node.js 18 runtime, utilizing the updated v3 Amazon SDK for Javascript.  I have uploaded it here for anyone to use.

# Configuration
Unike the SAM application provided by Amazon, This is just the Lambda function code. I am publishing it for all to have so if you run into issues using the v3 SDK, you can see how some of this works.  For this to do its intended purpose, it requires an Eventbridge trigger to go off once a day, and it requires an execution role that includes the following:

            "Action": [
              "lightsail:GetInstances",
              "lightsail:GetInstanceSnapshots",
              "lightsail:CreateInstanceSnapshot",
              "lightsail:DeleteInstanceSnapshot",
              "lightsail:GetRelationalDatabases",
              "lightsail:GetRelationalDatabaseSnapshots",
              "lightsail:CreateRelationalDatabaseSnapshot",
              "lightsail:DeleteRelationalDatabaseSnapshot",
              "ses:SendEmail",
              "ses:SendRawEmail"

Also, requires Environment Variables to be defined, or the defaults in the code will be used.
