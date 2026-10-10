#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "LVRoomBuilder.generated.h"

class UStaticMeshComponent;

UCLASS(Blueprintable)
class LOVEVERSEUNREAL_API ALVRoomBuilder : public AActor
{
    GENERATED_BODY()

public:
    ALVRoomBuilder();

    UFUNCTION(BlueprintCallable)
    void BuildDefaultCoupleRoom();

protected:
    virtual void OnConstruction(const FTransform& Transform) override;

private:
    UStaticMeshComponent* AddRoomMesh(const FString& Name, FVector Location, FVector Scale, FLinearColor Color);
};
