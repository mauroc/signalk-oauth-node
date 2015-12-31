### Base



#### GET /:version(.json)

 List of all available endpoints with examples.



#### GET /:version/users/me(.json)

 authentication user profile: squiddio user id, email, first name, last name, boat id, boat name, boat mmsi



#### GET /:version/vessels(.json)

 All vessels in database (limit=1000)



#### GET /:version/vessels/:id(.json)

 All data for vessel(s) with specified ID/

**Parameters:** 


 - id (String) (*required*) : Structure: ID:Attribute (e.g. 301238728:friends).  ID can be / self / MMSI / partial MMSI (e.g, 201*)/. Attribute (optional) can be /Friends/Nearby 



#### GET /:version/vessels/:id/navigation(.json)

 Last reported coordinates, true heading and speed over ground for vessel(s) with specified ID

**Parameters:** 


 - id (String) (*required*) : Structure: ID:Attribute (e.g. 301238728:friends).  ID can be / self / MMSI / partial MMSI (e.g, 201*)/. Attribute (optional) can be /Friends/Nearby 



#### GET /:version/vessels/:id/navigation/position(.json)

 Last reported coordinates for vessel(s) with specified ID

**Parameters:** 


 - id (String) (*required*) : Structure: ID:Attribute (e.g. 301238728:friends).  ID can be / self / MMSI / partial MMSI (e.g, 201*)/. Attribute (optional) can be /Friends/Nearby 



#### GET /:version/resources/:id/waypoints(.json)

 Nearby sQuiddio destinations for vessel(s) with specified ID

**Parameters:** 


 - id (String) (*required*) : Structure: ID:Attribute (e.g. 301238728:friends).  ID can be / self / MMSI / partial MMSI (e.g, 201*)/. Attribute (optional) can be /Friends/Nearby 

 - range (Integer) : search within range (in Km. Default=10) 




