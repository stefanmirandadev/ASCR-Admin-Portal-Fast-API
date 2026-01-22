# Data Transport

This module contains code for moving cell line records between working, queued and registered states.

The responsibilties of this module are:
    - Moving cell line records from working directory to queued directory
    - Receiving communications from the registry website about which records were accepted and registered 
    - Calling methods from the version control module and storage module to version new records and store them in the right directory.
    - Moving cell line records from the queued to registered directory.

::: data_transport