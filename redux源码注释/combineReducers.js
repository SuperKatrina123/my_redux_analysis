import ActionTypes from './untils/actionTypes'
import warning from './untils/warning'
import isPlainObject from './untils/isPlainObject'

function getUndefinedStateErrorMessage(key, action) {
    const actionType = action && action.type
    const actionDescription =
      (actionType && `action "${String(actionType)}"`) || 'an action'
  
    return (
      `Given ${actionDescription}, reducer "${key}" returned undefined. ` +
      `To ignore an action, you must explicitly return the previous state. ` +
      `If you want this reducer to hold no value, you can return null instead of undefined.`
    )
  }


function getUnexpectedStateShapeWarningMessage(
    inputState,
    reducers,
    action,
    unexpectedKeyCache
  ) {
    const reducerKeys = Object.keys(reducers)
    const argumentName =
      action && action.type === ActionTypes.INIT
        ? 'preloadedState argument passed to createStore'
        : 'previous state received by the reducer'
  
    if (reducerKeys.length === 0) {
      return (
        'Store does not have a valid reducer. Make sure the argument passed ' +
        'to combineReducers is an object whose values are reducers.'
      )
    }
  
    if (!isPlainObject(inputState)) {
      return (
        `The ${argumentName} has unexpected type of "` +
        {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
        `". Expected argument to be an object with the following ` +
        `keys: "${reducerKeys.join('", "')}"`
      )
    }
  
    const unexpectedKeys = Object.keys(inputState).filter(
      key => !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key]
    )
  
    unexpectedKeys.forEach(key => {
      unexpectedKeyCache[key] = true
    })
  
    if (action && action.type === ActionTypes.REPLACE) return
  
    if (unexpectedKeys.length > 0) {
      return (
        `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
        `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
        `Expected to find one of the known reducer keys instead: ` +
        `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
      )
    }
  }

/*
	assertReducerShape(reducers)??????
	??????????????????
		- reducers 
	???????????????
		- reducers 
*/
function assertReducerShape(reducers) {
    Object.keys(reducers).forEach(key => {
      const reducer = reducers[key]
      const initialState = reducer(undefined, { type: ActionTypes.INIT })
  
      if (typeof initialState === 'undefined') {
        throw new Error(
          `Reducer "${key}" returned undefined during initialization. ` +
            `If the state passed to the reducer is undefined, you must ` +
            `explicitly return the initial state. The initial state may ` +
            `not be undefined. If you don't want to set a value for this reducer, ` +
            `you can use null instead of undefined.`
        )
      }
  
      if (
        typeof reducer(undefined, {
          type: ActionTypes.PROBE_UNKNOWN_ACTION()
        }) === 'undefined'
      ) {
        throw new Error(
          `Reducer "${key}" returned undefined when probed with a random type. ` +
            `Don't try to handle ${ActionTypes.INIT} or other actions in "redux/*" ` +
            `namespace. They are considered private. Instead, you must return the ` +
            `current state for any unknown actions, unless it is undefined, ` +
            `in which case you must return the initial state, regardless of the ` +
            `action type. The initial state may not be undefined, but can be null.`
        )
      }
    })
  }

/*
	combineReducers??????????????????reducers
		?????????????????????
			- reducers?????????reducer
		???????????????
			- combination ?????? ????????????????????????
*/
export default function combineReducers(reducers) {
    /*
        mock:
        reducers = {
            reducer1: reducer1,
            reducer2: reducer2,
            ...
            reducern: reducern,
        }
        ?????????????????????
            reducerKeys = [reducer1, reducer2, ..., reducer3]
            finalReducers = {}
    */
    const reducerKeys = Object.keys(reducers)
    const finalReducers = {}
    
    // ???????????????????????????...   ??????finalReducers 
    // ??????reducers
    for (let i = 0; i < reducerKeys.length; i++) {
      const key = reducerKeys[i]
      
      // process.env.NODE_ENV???????????????????????????????????????
      if (process.env.NODE_ENV !== 'production') {
        if (typeof reducers[key] === 'undefined') {
          warning(`No reducer provided for key "${key}"`)
        }
      }
      
      // ??????reducer??????????????????????????????finalReducers??????
      if (typeof reducers[key] === 'function') {
        finalReducers[key] = reducers[key]
      }
    }
      
    const finalReducerKeys = Object.keys(finalReducers)
  
    // This is used to make sure we don't warn about the same
    // keys multiple times.
    let unexpectedKeyCache
    if (process.env.NODE_ENV !== 'production') {
      unexpectedKeyCache = {}
    }
  
    // ??????reducers??????reducer
    let shapeAssertionError
    try {
      assertReducerShape(finalReducers)      // --------?????????????????????????????????
    } catch (e) {
      shapeAssertionError = e
    }
      
      
    /*
        combination?????????
        ?????????????????????
            - state????????????????????????
            - action??????????????? {type:xxx, data:xxx}
    */
    return function combination(state = {}, action) {
      if (shapeAssertionError) {
        throw shapeAssertionError
      }
  
      if (process.env.NODE_ENV !== 'production') {
        const warningMessage = getUnexpectedStateShapeWarningMessage(
          state,
          finalReducers,
          action,
          unexpectedKeyCache
        )
        if (warningMessage) {
          warning(warningMessage)
        }
      }
      
      /*
        ?????????????????????
            hasChanged = false
            nextState = {}
      */
      let hasChanged = false   // ????????????????????????????????????
      const nextState = {}
      /*
          mock:
          finalReducers = {
              reducer1: reducer1,
              reducer2: reducer2,
              ...
              reducern: reducern,
            }
            
            finalReducerKeys = [reducer1, reducer2, reducer3, ...]
            
      */
      for (let i = 0; i < finalReducerKeys.length; i++) {  // ??????finalReducers
        const key = finalReducerKeys[i]					// reducer1, reducer2, reducer3, ...
        const reducer = finalReducers[key]                 // ????????????reducer: reducer1, reducer2, reducer3
        const previousStateForKey = state[key]             // ????????????reducer???state
        const nextStateForKey = reducer(previousStateForKey, action)  // reducer?????????????????????????????????state
        if (typeof nextStateForKey === 'undefined') {
          const errorMessage = getUndefinedStateErrorMessage(key, action) // --------?????????????????????????????????
          throw new Error(errorMessage)
        }
        nextState[key] = nextStateForKey                  // nextState??????????????????state [key=key, value=??????state]
        hasChanged = hasChanged || nextStateForKey !== previousStateForKey   // ???????????????????????????
      }
        
      hasChanged =
        hasChanged || finalReducerKeys.length !== Object.keys(state).length   // ????????????????????????
      return hasChanged ? nextState : state   // ????????? ??????nextState ?????? ??????state 
    }
  }